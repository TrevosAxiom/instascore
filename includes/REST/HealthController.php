<?php
/**
 * Health endpoint.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use WP_REST_Request;
use WP_REST_Response;

final class HealthController {
	public const ROUTE = '/health';

	public function register(): void {
		register_rest_route(
			'instascore/v1',
			self::ROUTE,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'handle' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function handle( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		return Envelope::success(
			array(
				'status'          => 'ok',
				'pluginVersion'   => INSTASCORE_PLATFORM_VERSION,
				'databaseVersion' => (int) get_option( 'instascore_db_version', 0 ),
				'timestamp'       => gmdate( DATE_ATOM ),
			)
		);
	}
}
