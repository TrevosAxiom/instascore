<?php
/**
 * Public and authenticated fantasy API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\FantasyService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class FantasyController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/fantasy/games',
			array(
				'methods'             => 'GET',
				'callback'            => fn(): WP_REST_Response => Envelope::success( FantasyService::create()->games() ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/fantasy/games/(?P<uuid>[0-9a-f-]{36})',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyService::create()->game( (string) $request['uuid'] ) ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/fantasy/games/(?P<uuid>[0-9a-f-]{36})/players',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute(
					fn(): array => FantasyService::create()->player_pool(
						(string) $request['uuid'],
						array(
							'search'   => $request->get_param( 'search' ),
							'position' => $request->get_param( 'position' ),
						)
					)
				),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/fantasy/games/(?P<uuid>[0-9a-f-]{36})/squad',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyService::create()->current_squad( get_current_user_id(), (string) $request['uuid'] ) ),
					'permission_callback' => array( $this, 'authenticated' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->save( $request, false ),
					'permission_callback' => array( $this, 'authenticated' ),
				),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/fantasy/games/(?P<uuid>[0-9a-f-]{36})/squad/submit',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->save( $request, true ),
				'permission_callback' => array( $this, 'authenticated' ),
			)
		);
	}

	public function authenticated(): bool|WP_Error {
		return is_user_logged_in() ? true : new WP_Error( 'instascore_authentication_required', __( 'Authentication is required.', 'instascore-platform' ), array( 'status' => 401 ) );
	}

	public function save( WP_REST_Request $request, bool $submit ): WP_REST_Response {
		return $this->execute(
			fn(): array => FantasyService::create()->save_squad(
				get_current_user_id(),
				(string) $request['uuid'],
				(array) $request->get_json_params(),
				$submit
			)
		);
	}

	private function execute( callable $callback, int $status = 200 ): WP_REST_Response {
		try {
			return Envelope::success( $callback(), array(), $status );
		} catch ( ValidationException $error ) {
			$status_code = isset( $error->errors()['revision'] ) ? 409 : 422;
			return Envelope::error( 'instascore_fantasy_validation_failed', $error->getMessage(), $error->errors(), $status_code );
		} catch ( \Throwable $error ) {
			do_action( 'instascore_log_error', $error );
			return Envelope::error( 'instascore_fantasy_failed', 'The fantasy request could not be completed.', array(), 500 );
		}
	}
}
