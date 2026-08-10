<?php
/**
 * Unified administration and operations REST API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Services\OperationsService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class OperationsController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/operations/dashboard', array(
			'methods'             => 'GET',
			'callback'            => fn(): WP_REST_Response => Envelope::success( OperationsService::create()->dashboard() ),
			'permission_callback' => array( $this, 'can_view' ),
		) );

		register_rest_route( 'instascore/v1', '/operations/settings', array(
			'methods'             => 'PUT',
			'callback'            => array( $this, 'settings' ),
			'permission_callback' => array( $this, 'can_manage' ),
		) );

		register_rest_route( 'instascore/v1', '/operations/actions/(?P<action>[a-z0-9_-]+)', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'action' ),
			'permission_callback' => array( $this, 'can_manage' ),
		) );

		register_rest_route( 'instascore/v1', '/operations/exports/(?P<type>[a-z0-9_-]+)', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'export' ),
			'permission_callback' => array( $this, 'can_manage' ),
		) );
	}

	public function can_view(): bool|WP_Error {
		return current_user_can( 'instascore_access_operations' ) || current_user_can( 'instascore_access_admin' )
			? true
			: new WP_Error( 'instascore_forbidden', __( 'Operations access is required.', 'instascore-platform' ), array( 'status' => 403 ) );
	}

	public function can_manage(): bool|WP_Error {
		return current_user_can( 'instascore_access_admin' )
			? true
			: new WP_Error( 'instascore_forbidden', __( 'Administrator access is required for operational changes.', 'instascore-platform' ), array( 'status' => 403 ) );
	}

	public function settings( WP_REST_Request $request ): WP_REST_Response {
		$input = $request->get_json_params();
		return Envelope::success( OperationsService::create()->update_settings( is_array( $input ) ? $input : array(), get_current_user_id() ) );
	}

	public function action( WP_REST_Request $request ): WP_REST_Response {
		$input  = $request->get_json_params();
		$action = sanitize_key( (string) $request['action'] );
		return Envelope::success( OperationsService::create()->action( $action, is_array( $input ) ? $input : array(), get_current_user_id() ) );
	}

	public function export( WP_REST_Request $request ): WP_REST_Response {
		return Envelope::success( OperationsService::create()->export( sanitize_key( (string) $request['type'] ), get_current_user_id() ) );
	}
}
