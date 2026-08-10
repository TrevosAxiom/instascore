<?php
/**
 * User theme preference endpoint.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class ThemeController {
	public const ROUTE = '/me/theme';

	public function register(): void {
		register_rest_route(
			'instascore/v1',
			self::ROUTE,
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'handle' ),
				'permission_callback' => array( $this, 'permissions' ),
				'args'                => array(
					'theme' => array(
						'required'          => true,
						'type'              => 'string',
						'enum'              => array( 'light', 'dark', 'system' ),
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);
	}

	public function permissions(): bool|WP_Error {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'instascore_authentication_required',
				__( 'Authentication is required.', 'instascore-platform' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	public function handle( WP_REST_Request $request ): WP_REST_Response {
		$theme = sanitize_key( (string) $request->get_param( 'theme' ) );
		update_user_meta( get_current_user_id(), 'instascore_theme_preference', $theme );

		return Envelope::success( array( 'theme' => $theme ) );
	}
}
