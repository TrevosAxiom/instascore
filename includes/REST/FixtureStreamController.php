<?php
/**
 * Public and protected fixture livestream API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Auth\FixturePermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\FixtureStreamService;
use WP_REST_Request;
use WP_REST_Response;

final class FixtureStreamController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/fixtures/(?P<uuid>[0-9a-f-]{36})/broadcast', array(
			'methods' => 'GET', 'callback' => array( $this, 'show' ), 'permission_callback' => '__return_true',
		) );
		register_rest_route( 'instascore/v1', '/admin/fixtures/(?P<uuid>[0-9a-f-]{36})/broadcast', array(
			array( 'methods' => 'GET', 'callback' => array( $this, 'admin_show' ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ),
			array( 'methods' => 'PUT', 'callback' => array( $this, 'save' ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ),
			array( 'methods' => 'DELETE', 'callback' => array( $this, 'disable' ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ),
		) );
	}

	public function show( WP_REST_Request $request ): WP_REST_Response {
		$stream = FixtureStreamService::create()->get( (string) $request['uuid'], true );
		return null === $stream ? Envelope::error( 'instascore_stream_not_found', 'No broadcast is available for this fixture.', array(), 404 ) : Envelope::success( $stream );
	}

	public function admin_show( WP_REST_Request $request ): WP_REST_Response {
		$stream = FixtureStreamService::create()->get( (string) $request['uuid'] );
		return Envelope::success( $stream );
	}

	public function save( WP_REST_Request $request ): WP_REST_Response {
		try {
			return Envelope::success( FixtureStreamService::create()->save( (string) $request['uuid'], (array) $request->get_json_params(), get_current_user_id() ) );
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_stream_validation_failed', $error->getMessage(), $error->errors(), 422 );
		} catch ( \Throwable $error ) {
			do_action( 'instascore_log_error', $error );
			return Envelope::error( 'instascore_stream_save_failed', 'The broadcast could not be saved.', array(), 500 );
		}
	}

	public function disable( WP_REST_Request $request ): WP_REST_Response {
		return Envelope::success( FixtureStreamService::create()->disable( (string) $request['uuid'] ) );
	}
}
