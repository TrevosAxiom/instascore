<?php
/**
 * Scorekeeper operations API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Auth\ScoringPermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\ScoringService;
use WP_REST_Request;
use WP_REST_Response;

final class OperationsScoringController {
	public function register(): void {
		$routes = array(
			'/operations/fixtures/(?P<uuid>[0-9a-f-]{36})/claim'    => fn( WP_REST_Request $request ): array => ScoringService::create()->claim_fixture( (string) $request['uuid'] ),
			'/operations/fixtures/(?P<uuid>[0-9a-f-]{36})/release'  => fn( WP_REST_Request $request ): array => ScoringService::create()->release_fixture( (string) $request['uuid'] ),
			'/operations/fixtures/(?P<uuid>[0-9a-f-]{36})/events'   => fn( WP_REST_Request $request ): array => ScoringService::create()->append_event( (string) $request['uuid'], (array) $request->get_json_params() ),
			'/operations/fixtures/(?P<uuid>[0-9a-f-]{36})/complete' => fn( WP_REST_Request $request ): array => ScoringService::create()->complete_fixture( (string) $request['uuid'] ),
		);
		foreach ( $routes as $route => $callback ) {
			register_rest_route(
				'instascore/v1',
				$route,
				array(
					'methods'             => 'POST',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => $callback( $request ) ),
					'permission_callback' => array( ScoringPermissions::class, 'manage_scoring' ),
				)
			);
		}
		register_rest_route(
			'instascore/v1',
			'/operations/fixtures/(?P<uuid>[0-9a-f-]{36})/clock/(?P<action>[a-z_]+)',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => ScoringService::create()->clock( (string) $request['uuid'], (string) $request['action'], (array) $request->get_json_params() ) ),
				'permission_callback' => array( ScoringPermissions::class, 'manage_scoring' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/operations/fixtures/(?P<uuid>[0-9a-f-]{36})/events/(?P<event_uuid>[0-9a-f-]{36})/void',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'void' ),
				'permission_callback' => array( ScoringPermissions::class, 'manage_scoring' ),
			)
		);
	}

	public function void( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		return $this->execute( fn(): array => ScoringService::create()->void_event( (string) $request['uuid'], (string) $request['event_uuid'], (string) ( $params['reason'] ?? '' ) ) );
	}

	private function execute( callable $callback ): WP_REST_Response {
		try {
			return Envelope::success( $callback() );
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_scoring_validation_failed', $error->getMessage(), $error->errors(), 409 );
		} catch ( \Throwable $error ) {
			do_action( 'instascore_log_error', $error );
			return Envelope::error( 'instascore_scoring_failed', 'The scoring action could not be saved.', array(), 500 );
		}
	}
}
