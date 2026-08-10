<?php
/**
 * Notification preference and OneSignal endpoints.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Notifications\NotificationCategory;
use InstaScore\Platform\Notifications\OneSignalAdapter;
use InstaScore\Platform\Repositories\NotificationRepository;
use InstaScore\Platform\Support\Config;
use InstaScore\Platform\Support\Pwa;
use InstaScore\Platform\Support\UserIdentity;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class NotificationController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/notifications/preferences', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'preferences' ),
				'permission_callback' => array( $this, 'authenticated' ),
			),
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'save_preferences' ),
				'permission_callback' => array( $this, 'authenticated' ),
			),
		) );

		register_rest_route( 'instascore/v1', '/notifications/subscriptions/sync', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'sync_subscription' ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );

		register_rest_route( 'instascore/v1', '/notifications/follows', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'follow' ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );

		register_rest_route( 'instascore/v1', '/admin/notifications/test-send', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'test_send' ),
			'permission_callback' => array( $this, 'admin' ),
		) );

		register_rest_route( 'instascore/v1', '/admin/notifications/worker-check', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'worker_check' ),
			'permission_callback' => array( $this, 'admin' ),
		) );
	}

	public function authenticated(): bool|WP_Error {
		return is_user_logged_in() ? true : new WP_Error( 'instascore_authentication_required', __( 'Authentication is required.', 'instascore-platform' ), array( 'status' => 401 ) );
	}

	public function admin(): bool|WP_Error {
		return current_user_can( 'instascore_access_admin' ) ? true : new WP_Error( 'instascore_forbidden', __( 'Administrator access is required.', 'instascore-platform' ), array( 'status' => 403 ) );
	}

	public function preferences(): WP_REST_Response {
		return Envelope::success(
			array(
				'categories'   => NotificationCategory::all(),
				'preferences'  => $this->repository()->preferences_for_user( get_current_user_id() ),
				'disabled'     => Config::notifications_disabled(),
				'workerUrl'    => Pwa::onesignal_worker_url(),
			)
		);
	}

	public function save_preferences( WP_REST_Request $request ): WP_REST_Response {
		$preferences = $request->get_param( 'preferences' );
		$this->repository()->save_preferences( get_current_user_id(), is_array( $preferences ) ? $preferences : array() );
		return $this->preferences();
	}

	public function sync_subscription( WP_REST_Request $request ): WP_REST_Response {
		$this->repository()->sync_subscription(
			get_current_user_id(),
			UserIdentity::uuid( get_current_user_id() ),
			is_array( $request->get_json_params() ) ? $request->get_json_params() : array()
		);

		return Envelope::success( array( 'synced' => true ) );
	}

	public function follow( WP_REST_Request $request ): WP_REST_Response {
		$entity_type = sanitize_key( (string) $request->get_param( 'entityType' ) );
		$entity_uuid = sanitize_text_field( (string) $request->get_param( 'entityUuid' ) );
		$status      = sanitize_key( (string) ( $request->get_param( 'status' ) ?: 'active' ) );

		if ( ! in_array( $entity_type, array( 'team', 'competition' ), true ) || ! wp_is_uuid( $entity_uuid ) ) {
			return Envelope::error( 'instascore_invalid_follow', __( 'A valid team or competition UUID is required.', 'instascore-platform' ), array(), 422 );
		}

		$this->repository()->record_follow( get_current_user_id(), $entity_type, $entity_uuid, $status );
		return Envelope::success( array( 'followed' => true ) );
	}

	public function test_send( WP_REST_Request $request ): WP_REST_Response {
		$payload = array(
			'title'       => sanitize_text_field( (string) ( $request->get_param( 'title' ) ?: 'InstaScore test' ) ),
			'body'        => sanitize_text_field( (string) ( $request->get_param( 'body' ) ?: 'Push notifications are connected.' ) ),
			'launchUrl'   => esc_url_raw( (string) ( $request->get_param( 'launchUrl' ) ?: home_url( '/scores' ) ) ),
			'category'    => sanitize_key( (string) ( $request->get_param( 'category' ) ?: NotificationCategory::TEAM_NEWS ) ),
			'eventUuid'   => wp_generate_uuid4(),
			'collapseKey' => 'admin-test-' . get_current_user_id(),
		);

		return Envelope::success( ( new OneSignalAdapter() )->send( array( UserIdentity::uuid( get_current_user_id() ) ), $payload ) );
	}

	public function worker_check(): WP_REST_Response {
		$root_file = INSTASCORE_PLATFORM_PATH . 'dist/OneSignalSDKWorker.js';
		$safe_file = INSTASCORE_PLATFORM_PATH . 'dist/push/onesignal/OneSignalSDKWorker.js';

		return Envelope::success(
			array(
				'rootWorkerUrl' => Pwa::onesignal_worker_url(),
				'rootReadable'  => is_readable( $root_file ),
				'safeReadable'  => is_readable( $safe_file ),
				'contentType'   => 'application/javascript; charset=utf-8',
				'html404Risk'   => ! is_readable( $root_file ),
			)
		);
	}

	private function repository(): NotificationRepository {
		global $wpdb;
		return new NotificationRepository( $wpdb );
	}
}
