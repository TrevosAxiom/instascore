<?php
/**
 * Fantasy administration API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\FantasyService;
use WP_REST_Request;
use WP_REST_Response;

final class AdminFantasyController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/admin/fantasy/games',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyService::create()->create_game( (array) $request->get_json_params(), get_current_user_id() ), 201 ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
	}

	public function can_manage(): bool {
		return current_user_can( 'manage_options' ) || current_user_can( 'instascore_manage_leagues' );
	}

	private function execute( callable $callback, int $status = 200 ): WP_REST_Response {
		try {
			return Envelope::success( $callback(), array(), $status );
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_fantasy_validation_failed', $error->getMessage(), $error->errors(), 422 );
		} catch ( \Throwable $error ) {
			do_action( 'instascore_log_error', $error );
			return Envelope::error( 'instascore_fantasy_failed', 'The fantasy change could not be saved.', array(), 500 );
		}
	}
}
