<?php
/**
 * Commissioner scoring API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Auth\ScoringPermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\ScoringService;
use WP_REST_Request;
use WP_REST_Response;

final class AdminScoringController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/admin/fixtures/(?P<uuid>[0-9a-f-]{36})/scorekeepers',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'assign' ),
				'permission_callback' => array( ScoringPermissions::class, 'manage_scoring' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/fixtures/(?P<uuid>[0-9a-f-]{36})/confirm-result',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'confirm' ),
				'permission_callback' => array( ScoringPermissions::class, 'confirm_results' ),
			)
		);
	}

	public function assign( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		return $this->execute( fn(): array => ScoringService::create()->assign_scorekeeper( (string) $request['uuid'], max( 1, (int) ( $params['userId'] ?? 0 ) ) ), 201 );
	}

	public function confirm( WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => ScoringService::create()->confirm_result( (string) $request['uuid'] ) );
	}

	private function execute( callable $callback, int $status = 200 ): WP_REST_Response {
		try {
			return Envelope::success( $callback(), array(), $status );
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_scoring_validation_failed', $error->getMessage(), $error->errors(), 422 );
		}
	}
}
