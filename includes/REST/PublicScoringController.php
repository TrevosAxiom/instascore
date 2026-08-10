<?php
/**
 * Public live scoring polling API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\ScoringService;
use WP_REST_Request;
use WP_REST_Response;

final class PublicScoringController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/fixtures/(?P<uuid>[0-9a-f-]{36})/live',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'show' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/fixtures/(?P<uuid>[0-9a-f-]{36})/live/stream',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'stream' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function show( WP_REST_Request $request ): WP_REST_Response {
		try {
			$response = Envelope::success( ScoringService::create()->public_state( (string) $request['uuid'], max( 0, (int) ( $request->get_param( 'after_revision' ) ?: 0 ) ) ) );
			$response->header( 'Cache-Control', 'no-store, must-revalidate' );
			return $response;
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_not_found', $error->getMessage(), $error->errors(), 404 );
		}
	}

	public function stream( WP_REST_Request $request ): WP_REST_Response {
		try {
			$state    = ScoringService::create()->public_state( (string) $request['uuid'], max( 0, (int) ( $request->get_param( 'after_revision' ) ?: 0 ) ) );
			$event_id = (string) ( $state['revision'] ?? time() );
			$payload  = "id: {$event_id}\n";
			$payload .= "event: live-state\n";
			$payload .= 'data: ' . wp_json_encode( $state, JSON_UNESCAPED_SLASHES ) . "\n\n";

			$response = new WP_REST_Response( $payload );
			$response->header( 'Content-Type', 'text/event-stream; charset=utf-8' );
			$response->header( 'Cache-Control', 'no-store, no-transform' );
			$response->header( 'X-Accel-Buffering', 'no' );
			return $response;
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_not_found', $error->getMessage(), $error->errors(), 404 );
		}
	}
}
