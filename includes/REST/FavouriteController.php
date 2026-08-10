<?php
/**
 * Favourites, preferences and personal search API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Repositories\FavouriteRepository;
use InstaScore\Platform\Repositories\NotificationRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class FavouriteController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/me/favourites', array(
			array(
				'methods'             => 'GET',
				'callback'            => fn(): WP_REST_Response => Envelope::success( $this->repository()->list_for_user( get_current_user_id() ) ),
				'permission_callback' => array( $this, 'authenticated' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'follow' ),
				'permission_callback' => array( $this, 'authenticated' ),
			),
		) );

		register_rest_route( 'instascore/v1', '/me/favourites/(?P<entityType>team|competition|player)/(?P<entityUuid>[0-9a-f-]{36})', array(
			'methods'             => 'DELETE',
			'callback'            => array( $this, 'unfollow' ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );

		register_rest_route( 'instascore/v1', '/me/favourites/merge', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'merge' ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );

		register_rest_route( 'instascore/v1', '/me/preferences', array(
			array(
				'methods'             => 'GET',
				'callback'            => fn(): WP_REST_Response => Envelope::success( $this->repository()->preferences( get_current_user_id() ) ),
				'permission_callback' => array( $this, 'authenticated' ),
			),
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'save_preferences' ),
				'permission_callback' => array( $this, 'authenticated' ),
			),
		) );

		register_rest_route( 'instascore/v1', '/me/feed', array(
			'methods'             => 'GET',
			'callback'            => fn(): WP_REST_Response => Envelope::success( $this->personal_feed() ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );

		register_rest_route( 'instascore/v1', '/me/alerts', array(
			'methods'             => 'GET',
			'callback'            => fn(): WP_REST_Response => Envelope::success( $this->repository()->alerts( get_current_user_id() ) ),
			'permission_callback' => array( $this, 'authenticated' ),
		) );

		register_rest_route( 'instascore/v1', '/search', array(
			'methods'             => 'GET',
			'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => Envelope::success( $this->repository()->search( sanitize_text_field( (string) $request->get_param( 'q' ) ) ) ),
			'permission_callback' => '__return_true',
		) );
	}

	public function authenticated(): bool|WP_Error {
		return is_user_logged_in() ? true : new WP_Error( 'instascore_authentication_required', __( 'Authentication is required.', 'instascore-platform' ), array( 'status' => 401 ) );
	}

	public function follow( WP_REST_Request $request ): WP_REST_Response {
		$type = sanitize_key( (string) $request->get_param( 'entityType' ) );
		$uuid = sanitize_text_field( (string) $request->get_param( 'entityUuid' ) );
		if ( ! in_array( $type, array( 'team', 'competition', 'player' ), true ) || ! wp_is_uuid( $uuid ) ) {
			return Envelope::error( 'instascore_invalid_favourite', __( 'A valid team, competition or player UUID is required.', 'instascore-platform' ), array(), 422 );
		}
		$row  = $this->repository()->follow( get_current_user_id(), $type, $uuid );
		$this->notification_repository()->record_follow( get_current_user_id(), $type, $uuid, 'active' );
		return Envelope::success( $row, array( 'oneSignalTags' => $this->tags( $type, $uuid, true ) ) );
	}

	public function unfollow( WP_REST_Request $request ): WP_REST_Response {
		$type = sanitize_key( (string) $request['entityType'] );
		$uuid = sanitize_text_field( (string) $request['entityUuid'] );
		$this->repository()->unfollow( get_current_user_id(), $type, $uuid );
		$this->notification_repository()->record_follow( get_current_user_id(), $type, $uuid, 'muted' );
		return Envelope::success( array( 'unfollowed' => true ), array( 'oneSignalTags' => $this->tags( $type, $uuid, false ), 'suppressedFutureAlerts' => true ) );
	}

	public function merge( WP_REST_Request $request ): WP_REST_Response {
		$favourites = $request->get_param( 'favourites' );
		return Envelope::success(
			array(
				'merged'     => $this->repository()->merge( get_current_user_id(), is_array( $favourites ) ? $favourites : array() ),
				'favourites' => $this->repository()->list_for_user( get_current_user_id() ),
			)
		);
	}

	public function save_preferences( WP_REST_Request $request ): WP_REST_Response {
		return Envelope::success( $this->repository()->save_preferences( get_current_user_id(), (array) $request->get_json_params() ) );
	}

	/**
	 * @return array<string,mixed>
	 */
	private function personal_feed(): array {
		$favourites = $this->repository()->list_for_user( get_current_user_id() );
		return array(
			'favourites' => $favourites,
			'items'      => array(),
			'suggestions' => array(
				array( 'type' => 'competition', 'label' => 'Follow a competition to build your personalised scores feed.' ),
				array( 'type' => 'team', 'label' => 'Follow teams to receive fixture and result alerts.' ),
			),
		);
	}

	/**
	 * @return array<string,string>
	 */
	private function tags( string $type, string $uuid, bool $active ): array {
		return array( 'fav_' . $type . '_' . str_replace( '-', '', $uuid ) => $active ? '1' : '' );
	}

	private function repository(): FavouriteRepository {
		global $wpdb;
		return new FavouriteRepository( $wpdb );
	}

	private function notification_repository(): NotificationRepository {
		global $wpdb;
		return new NotificationRepository( $wpdb );
	}
}
