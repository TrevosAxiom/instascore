<?php
/**
 * Public competition browsing API.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\REST;

use InstaScore\Platform\Repositories\CompetitionRepository;
use InstaScore\Platform\Repositories\SeasonRepository;
use InstaScore\Platform\Repositories\SportRepository;
use WP_REST_Request;
use WP_REST_Response;

final class CompetitionController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/sports',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'sports' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/competitions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'index' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/competitions/(?P<uuid>[0-9a-f-]{36})',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'show' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function index( WP_REST_Request $request ): WP_REST_Response {
		global $wpdb;
		$query    = array(
			'page'    => $request->get_param( 'page' ),
			'perPage' => $request->get_param( 'per_page' ),
			'sport'   => $request->get_param( 'sport' ),
			'type'    => $request->get_param( 'type' ),
			'search'  => $request->get_param( 'search' ),
			'sort'    => $request->get_param( 'sort' ),
			'order'   => $request->get_param( 'order' ),
			'includeArchived' => rest_sanitize_boolean( $request->get_param( 'include_archived' ) ) && current_user_can( 'instascore_access_admin' ),
		);
		$page     = max( 1, (int) ( $query['page'] ? $query['page'] : 1 ) );
		$per_page = min( 50, max( 1, (int) ( $query['perPage'] ? $query['perPage'] : 12 ) ) );
		$result   = ( new CompetitionRepository( $wpdb, 'competitions' ) )->public_list( $query );
		$response = Envelope::success(
			array_map( array( $this, 'present' ), $result['items'] ),
			array(
				'page'       => $page,
				'perPage'    => $per_page,
				'total'      => $result['total'],
				'totalPages' => (int) ceil( $result['total'] / $per_page ),
			)
		);
		return $this->conditional( $request, $response );
	}

	public function show( WP_REST_Request $request ): WP_REST_Response {
		global $wpdb;
		$competition = ( new CompetitionRepository( $wpdb, 'competitions' ) )->find_by_uuid( (string) $request['uuid'] );
		if ( null === $competition || 'active' !== $competition['status'] ) {
			return Envelope::error( 'instascore_not_found', 'Competition not found.', array(), 404 );
		}
		$include_archived = rest_sanitize_boolean( $request->get_param( 'include_archived' ) ) && current_user_can( 'instascore_access_admin' );
		$seasons         = ( new SeasonRepository( $wpdb, 'seasons' ) )->for_competition( (int) $competition['id'], $include_archived );
		$data            = $this->present( $competition );
		$data['seasons'] = array_map(
			static fn( array $row ): array => array(
				'uuid'      => $row['uuid'],
				'name'      => $row['name'],
				'slug'      => $row['slug'],
				'startDate' => $row['start_date'],
				'endDate'   => $row['end_date'],
				'status'    => $row['status'],
			),
			$seasons
		);
		return $this->conditional( $request, Envelope::success( $data ) );
	}

	public function sports( WP_REST_Request $request ): WP_REST_Response {
		global $wpdb;
		$table = $wpdb->prefix . 'instascore_sports';
		$status = rest_sanitize_boolean( $request->get_param( 'include_archived' ) ) && current_user_can( 'instascore_access_admin' ) ? "status IN ('active','archived')" : "status = 'active'";
		$rows  = $wpdb->get_results( "SELECT uuid,name,slug,status FROM {$table} WHERE {$status} ORDER BY name ASC", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Trusted plugin table identifier and fixed status clause.
		return Envelope::success( is_array( $rows ) ? $rows : array() );
	}

	private function present( array $row ): array {
		$rules = json_decode( (string) ( $row['rules_json'] ?? '{}' ), true );
		return array(
			'uuid'        => $row['uuid'],
			'name'        => $row['name'],
			'slug'        => $row['slug'],
			'type'        => $row['competition_type'],
			'description' => $row['description'] ?? '',
			'countryCode' => $row['country_code'] ?? null,
			'logoUrl'     => $row['logo_url'] ?? null,
			'sport'       => array(
				'uuid' => $row['sport_uuid'] ?? '',
				'name' => $row['sport_name'] ?? '',
				'slug' => $row['sport_slug'] ?? '',
			),
			'rules'       => is_array( $rules ) ? $rules : array(),
			'status'      => $row['status'],
			'updatedAt'   => $row['updated_at'],
		);
	}

	private function conditional( WP_REST_Request $request, WP_REST_Response $response ): WP_REST_Response {
		$etag = '"' . hash( 'sha256', wp_json_encode( $response->get_data() ) ) . '"';
		if ( $request->get_header( 'if-none-match' ) === $etag ) {
			$response = new WP_REST_Response( null, 304 );
		}
		$response->header( 'ETag', $etag );
		$response->header( 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300' );
		return $response;
	}
}
