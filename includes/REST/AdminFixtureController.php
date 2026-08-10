<?php
/**
 * Protected fixture scheduling API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Auth\FixturePermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\FixtureService;
use InstaScore\Platform\Repositories\FixtureRepository;
use WP_REST_Request;
use WP_REST_Response;

final class AdminFixtureController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/admin/fixtures',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'index' ),
				'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/fixtures',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FixtureService::create()->create_fixture( (array) $request->get_json_params() ), 201 ),
				'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/fixtures/(?P<uuid>[0-9a-f-]{36})',
			array(
				'methods'             => 'PATCH',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FixtureService::create()->update_fixture( (string) $request['uuid'], (array) $request->get_json_params() ) ),
				'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/fixtures/(?P<uuid>[0-9a-f-]{36})/status',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->status( $request ),
				'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ),
			)
		);
	}

	public function index( WP_REST_Request $request ): WP_REST_Response {
		global $wpdb;
		$page = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );
		$per_page = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 50 ) ) );
		$result = ( new FixtureRepository( $wpdb, 'fixtures' ) )->admin_list(
			array(
				'page' => $page,
				'perPage' => $per_page,
				'status' => $request->get_param( 'status' ),
				'sport' => $request->get_param( 'sport' ),
				'competition' => $request->get_param( 'competition' ),
				'date' => $request->get_param( 'date' ),
				'search' => $request->get_param( 'search' ),
			)
		);
		$presenter = new FixtureController();
		return Envelope::success( array_map( array( $presenter, 'present' ), $result['items'] ), array( 'page' => $page, 'perPage' => $per_page, 'total' => $result['total'], 'totalPages' => (int) ceil( $result['total'] / $per_page ) ) );
	}

	public function status( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		return $this->execute(
			fn(): array => FixtureService::create()->change_status(
				(string) $request['uuid'],
				(string) ( $params['status'] ?? '' ),
				(string) ( $params['reason'] ?? '' )
			)
		);
	}

	private function execute( callable $callback, int $status = 200 ): WP_REST_Response {
		try {
			return Envelope::success( $callback(), array(), $status );
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_validation_failed', $error->getMessage(), $error->errors(), 422 );
		} catch ( \Throwable $error ) {
			do_action( 'instascore_log_error', $error );
			return Envelope::error( 'instascore_fixture_failed', 'The fixture change could not be saved.', array(), 500 );
		}
	}
}
