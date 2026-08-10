<?php
/**
 * Fantasy scoring, transfers and leagues API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\FantasyScoringService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class FantasyScoringController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/fantasy/games/(?P<uuid>[0-9a-f-]{36})/points', array(
			'methods'             => 'GET',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyScoringService::create()->points_breakdown( get_current_user_id(), (string) $request['uuid'] ) ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );
		register_rest_route( 'instascore/v1', '/fantasy/games/(?P<uuid>[0-9a-f-]{36})/live-tracker', array(
			'methods'             => 'GET',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyScoringService::create()->live_tracker( (string) $request['uuid'] ) ),
			'permission_callback' => '__return_true',
		) );
		register_rest_route( 'instascore/v1', '/fantasy/games/(?P<uuid>[0-9a-f-]{36})/transfers', array(
			'methods'             => 'POST',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyScoringService::create()->make_transfer( get_current_user_id(), (string) $request['uuid'], (array) $request->get_json_params() ) ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );
		register_rest_route( 'instascore/v1', '/fantasy/games/(?P<uuid>[0-9a-f-]{36})/leagues', array(
			'methods'             => 'POST',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyScoringService::create()->create_league( get_current_user_id(), (string) $request['uuid'], (array) $request->get_json_params() ), 201 ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );
		register_rest_route( 'instascore/v1', '/fantasy/leagues/(?P<uuid>[0-9a-f-]{36})', array(
			'methods'             => 'GET',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyScoringService::create()->league( get_current_user_id(), (string) $request['uuid'] ) ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );
		register_rest_route( 'instascore/v1', '/admin/fantasy/games/(?P<uuid>[0-9a-f-]{36})/rules', array(
			'methods'             => 'POST',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyScoringService::create()->create_rule( (string) $request['uuid'], (array) $request->get_json_params() ), 201 ),
			'permission_callback' => array( $this, 'can_manage' ),
		) );
		register_rest_route( 'instascore/v1', '/admin/fantasy/games/(?P<uuid>[0-9a-f-]{36})/override', array(
			'methods'             => 'POST',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => FantasyScoringService::create()->admin_override( get_current_user_id(), (string) $request['uuid'], (array) $request->get_json_params() ) ),
			'permission_callback' => array( $this, 'can_manage' ),
		) );
	}

	public function authenticated(): bool|WP_Error {
		return is_user_logged_in() ? true : new WP_Error( 'instascore_authentication_required', __( 'Authentication is required.', 'instascore-platform' ), array( 'status' => 401 ) );
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
			return Envelope::error( 'instascore_fantasy_failed', 'The fantasy request could not be completed.', array(), 500 );
		}
	}
}
