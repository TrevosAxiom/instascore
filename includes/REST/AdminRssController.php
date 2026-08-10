<?php
/** Protected RSS administration API. @package InstaScore_Platform */
namespace InstaScore\Platform\REST;

use InstaScore\Platform\Services\RssImportService;
use InstaScore\Platform\Support\RssScheduler;
use WP_REST_Request;
use WP_REST_Response;

final class AdminRssController {
	public function register(): void {
		$permission = static fn(): bool => current_user_can( 'instascore_access_admin' );
		register_rest_route( 'instascore/v1', '/admin/rss', array(
			array( 'methods' => 'GET', 'callback' => array( $this, 'index' ), 'permission_callback' => $permission ),
			array( 'methods' => 'POST', 'callback' => array( $this, 'create' ), 'permission_callback' => $permission ),
		) );
		register_rest_route( 'instascore/v1', '/admin/rss/(?P<id>[0-9a-f-]{36})', array(
			array( 'methods' => 'PUT', 'callback' => array( $this, 'update' ), 'permission_callback' => $permission ),
			array( 'methods' => 'DELETE', 'callback' => array( $this, 'delete' ), 'permission_callback' => $permission ),
		) );
		register_rest_route( 'instascore/v1', '/admin/rss/sync', array( 'methods' => 'POST', 'callback' => array( $this, 'sync' ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/rss/import', array( 'methods' => 'POST', 'callback' => array( $this, 'import' ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/rss/settings', array( 'methods' => 'PUT', 'callback' => array( $this, 'settings' ), 'permission_callback' => $permission ) );
	}
	public function index(): WP_REST_Response {
		return Envelope::success( array( 'sources' => RssImportService::sources(), 'settings' => RssImportService::settings(), 'lastRun' => get_option( 'instascore_rss_last_run', null ), 'nextRunAt' => wp_next_scheduled( RssScheduler::HOOK ) ?: null ) );
	}
	public function create( WP_REST_Request $request ): WP_REST_Response {
		$error = $this->validate( $request );
		return $error ?: Envelope::success( RssImportService::save_source( $request->get_json_params() ), array(), 201 );
	}
	public function update( WP_REST_Request $request ): WP_REST_Response {
		$error = $this->validate( $request );
		return $error ?: Envelope::success( RssImportService::save_source( $request->get_json_params(), (string) $request['id'] ) );
	}
	public function delete( WP_REST_Request $request ): WP_REST_Response {
		return Envelope::success( array( 'deleted' => RssImportService::delete_source( (string) $request['id'] ) ) );
	}
	public function sync( WP_REST_Request $request ): WP_REST_Response {
		return Envelope::success( RssImportService::run( sanitize_text_field( (string) $request->get_param( 'sourceId' ) ) ) );
	}
	public function import( WP_REST_Request $request ): WP_REST_Response {
		$files = $request->get_file_params();
		$file  = $files['file'] ?? null;
		if ( ! is_array( $file ) || UPLOAD_ERR_OK !== (int) ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) ) {
			return Envelope::error( 'instascore_rss_csv_missing', 'Choose a readable CSV file.', array( 'file' => 'CSV file is required.' ), 422 );
		}
		if ( (int) ( $file['size'] ?? 0 ) > 2 * MB_IN_BYTES ) {
			return Envelope::error( 'instascore_rss_csv_large', 'The CSV file must be 2 MB or smaller.', array( 'file' => 'File is too large.' ), 413 );
		}
		$result = RssImportService::import_csv( (string) $file['tmp_name'] );
		return empty( $result['fatalError'] )
			? Envelope::success( $result, array(), 201 )
			: Envelope::error( 'instascore_rss_csv_invalid', (string) $result['fatalError'], array( 'file' => (string) $result['fatalError'] ), 422 );
	}
	public function settings( WP_REST_Request $request ): WP_REST_Response {
		$result = RssImportService::save_settings( $request->get_json_params() );
		RssScheduler::reschedule();
		return Envelope::success( $result );
	}
	private function validate( WP_REST_Request $request ): ?WP_REST_Response {
		$input = $request->get_json_params(); $fields = array();
		if ( '' === trim( (string) ( $input['site'] ?? '' ) ) ) $fields['site'] = 'Site is required.';
		if ( ! wp_http_validate_url( (string) ( $input['url'] ?? '' ) ) ) $fields['url'] = 'Enter a valid public RSS URL.';
		if ( '' === trim( (string) ( $input['category'] ?? '' ) ) ) $fields['category'] = 'Category is required.';
		return $fields ? Envelope::error( 'instascore_rss_validation', 'Check the highlighted RSS source fields.', $fields, 422 ) : null;
	}
}
