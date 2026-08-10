<?php
/**
 * Public/admin standings, statistics and discipline API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\StandingsService;
use WP_REST_Request;
use WP_REST_Response;

final class StandingsController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/competitions/(?P<uuid>[0-9a-f-]{36})/standings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'table' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/teams/(?P<uuid>[0-9a-f-]{36})/statistics',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'team_stats' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/players/leaders',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'leaders' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/discipline',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'discipline' ),
				'permission_callback' => fn(): bool => current_user_can( 'instascore_manage_fixtures' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/standings/rebuild',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'rebuild' ),
				'permission_callback' => fn(): bool => current_user_can( 'instascore_confirm_results' ),
			)
		);
	}

	public function table( WP_REST_Request $request ): WP_REST_Response {
		$response = Envelope::success( StandingsService::create()->table( (string) $request['uuid'], sanitize_text_field( (string) ( $request->get_param( 'season' ) ?? '' ) ) ) );
		$response->header( 'Cache-Control', 'public, max-age=30, must-revalidate' );
		return $response;
	}

	public function team_stats( WP_REST_Request $request ): WP_REST_Response {
		$response = Envelope::success( StandingsService::create()->team_stats( (string) $request['uuid'] ) );
		$response->header( 'Cache-Control', 'public, max-age=60, must-revalidate' );
		return $response;
	}

	public function leaders( WP_REST_Request $request ): WP_REST_Response {
		$response = Envelope::success( StandingsService::create()->leaders( sanitize_key( (string) ( $request->get_param( 'stat' ) ?? 'touchdowns' ) ), min( 50, max( 1, (int) ( $request->get_param( 'limit' ) ?? 10 ) ) ) ) );
		$response->header( 'Cache-Control', 'public, max-age=60, must-revalidate' );
		return $response;
	}

	public function discipline( WP_REST_Request $request ): WP_REST_Response {
		try {
			return Envelope::success( StandingsService::create()->create_discipline( (array) $request->get_json_params() ), array(), 201 );
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_discipline_validation_failed', $error->getMessage(), $error->errors(), 422 );
		}
	}

	public function rebuild( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		return Envelope::success( StandingsService::create()->rebuild_scope( (int) ( $params['competitionId'] ?? 0 ), (int) ( $params['seasonId'] ?? 0 ), null, null, 'admin_manual_rebuild' ) );
	}
}
