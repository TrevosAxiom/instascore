<?php
/**
 * Authentication-state endpoint.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Support\UserIdentity;
use WP_REST_Request;
use WP_REST_Response;

final class AuthController {
	public const ROUTE = '/auth/status';

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
		foreach ( array( 'login', 'register', 'forgot-password', 'logout' ) as $action ) {
			register_rest_route(
				'instascore/v1',
				'/auth/' . $action,
				array(
					'methods'             => 'POST',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->action( $action, $request ),
					'permission_callback' => '__return_true',
				)
			);
		}
	}

	private function action( string $action, WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		if ( 'logout' === $action ) {
			wp_logout();
			return Envelope::success( array( 'authenticated' => false ) );
		}
		$rate_key = 'instascore_auth_' . md5( $action . '|' . (string) ( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ) );
		$attempts = (int) get_transient( $rate_key );
		if ( $attempts >= 10 ) {
			return Envelope::error( 'instascore_auth_rate_limited', 'Too many attempts. Please wait a few minutes and try again.', array(), 429 );
		}
		set_transient( $rate_key, $attempts + 1, 10 * MINUTE_IN_SECONDS );

		if ( 'login' === $action ) {
			$login = sanitize_text_field( (string) ( $params['email'] ?? '' ) );
			if ( is_email( $login ) ) {
				$user = get_user_by( 'email', $login );
				$login = $user ? $user->user_login : $login;
			}
			$user = wp_signon( array( 'user_login' => $login, 'user_password' => (string) ( $params['password'] ?? '' ), 'remember' => ! empty( $params['remember'] ) ), is_ssl() );
			if ( is_wp_error( $user ) ) {
				return Envelope::error( 'instascore_login_failed', 'The email or password is incorrect.', array(), 401 );
			}
			delete_transient( $rate_key );
			return $this->handle( $request );
		}

		if ( 'register' === $action ) {
			$email = sanitize_email( (string) ( $params['email'] ?? '' ) );
			$password = (string) ( $params['password'] ?? '' );
			$name = sanitize_text_field( (string) ( $params['displayName'] ?? '' ) );
			if ( ! is_email( $email ) || strlen( $password ) < 8 || strlen( $name ) < 2 ) {
				return Envelope::error( 'instascore_registration_invalid', 'Enter your name, a valid email and a password of at least 8 characters.', array(), 422 );
			}
			if ( email_exists( $email ) ) {
				return Envelope::error( 'instascore_email_exists', 'An account already exists for this email. Try signing in or resetting your password.', array(), 409 );
			}
			$base = sanitize_user( strstr( $email, '@', true ), true ) ?: 'fan';
			$username = $base;
			for ( $suffix = 1; username_exists( $username ); ++$suffix ) {
				$username = $base . $suffix;
			}
			$user_id = wp_create_user( $username, $password, $email );
			if ( is_wp_error( $user_id ) ) {
				return Envelope::error( 'instascore_registration_failed', $user_id->get_error_message(), array(), 422 );
			}
			wp_update_user( array( 'ID' => $user_id, 'display_name' => $name, 'first_name' => $name, 'role' => 'subscriber' ) );
			wp_new_user_notification( $user_id, null, 'user' );
			wp_set_current_user( $user_id );
			wp_set_auth_cookie( $user_id, true, is_ssl() );
			delete_transient( $rate_key );
			return $this->handle( $request );
		}

		$email = sanitize_email( (string) ( $params['email'] ?? '' ) );
		$user = $email ? get_user_by( 'email', $email ) : false;
		if ( $user ) {
			retrieve_password( $user->user_login );
		}
		return Envelope::success( array( 'message' => 'If an account exists, a password reset email is on its way.' ) );
	}

	public function handle( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		if ( ! is_user_logged_in() ) {
			return Envelope::success(
				array(
					'authenticated' => false,
					'user'          => null,
					'nonce'         => null,
					'theme'         => null,
				)
			);
		}

		$user  = wp_get_current_user();
		$theme = (string) get_user_meta( $user->ID, 'instascore_theme_preference', true );

		return Envelope::success(
			array(
				'authenticated' => true,
				'user'          => array(
					'uuid'         => UserIdentity::uuid( (int) $user->ID ),
					'displayName'  => $user->display_name,
					'roles'        => array_values( $user->roles ),
					'capabilities' => array(
						'accessAdmin'        => current_user_can( 'instascore_access_admin' ),
						'accessOperations'   => current_user_can( 'instascore_access_operations' ),
					'manageLeagues'      => current_user_can( 'instascore_manage_leagues' ),
					'manageCompetitions' => current_user_can( 'instascore_manage_competitions' ),
					'manageTeams'        => current_user_can( 'instascore_manage_teams' ),
					'managePlayers'      => current_user_can( 'instascore_manage_players' ),
					'manageVenues'       => current_user_can( 'instascore_manage_venues' ),
					'manageOfficials'    => current_user_can( 'instascore_manage_officials' ),
					'manageUsers'        => current_user_can( 'instascore_manage_users' ),
					'manageFixtures'     => current_user_can( 'instascore_manage_fixtures' ),
					'manageScoring'      => current_user_can( 'instascore_manage_scoring' ),
					'confirmResults'     => current_user_can( 'instascore_confirm_results' ),
				),
			),
				'nonce'         => wp_create_nonce( 'wp_rest' ),
				'theme'         => in_array( $theme, array( 'light', 'dark', 'system' ), true )
					? $theme
					: 'system',
			)
		);
	}
}
