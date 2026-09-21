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
		foreach ( array( 'login', 'register', 'verify-email', 'resend-verification', 'forgot-password', 'logout' ) as $action ) {
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
			if ( '0' === (string) get_user_meta( (int) $user->ID, 'instascore_email_verified', true ) ) {
				wp_logout();
				wp_set_current_user( 0 );
				return Envelope::error( 'instascore_email_verification_required', 'Verify your email before signing in. We can send you a new code.', array( 'email' => 'verification_required' ), 403 );
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
			$existing_id = (int) email_exists( $email );
			if ( $existing_id > 0 ) {
				if ( '0' === (string) get_user_meta( $existing_id, 'instascore_email_verified', true ) ) {
					return $this->send_verification_response( $existing_id, $email );
				}
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
			update_user_meta( $user_id, 'instascore_email_verified', '0' );
			delete_transient( $rate_key );
			return $this->send_verification_response( (int) $user_id, $email, 201 );
		}

		if ( 'verify-email' === $action ) {
			$email = sanitize_email( (string) ( $params['email'] ?? '' ) );
			$code  = preg_replace( '/\D/', '', (string) ( $params['code'] ?? '' ) );
			$user  = $email ? get_user_by( 'email', $email ) : false;
			if ( ! $user || 6 !== strlen( $code ) || '0' !== (string) get_user_meta( (int) $user->ID, 'instascore_email_verified', true ) ) {
				return Envelope::error( 'instascore_verification_invalid', 'That verification code is invalid or has expired.', array(), 422 );
			}
			$expires  = (int) get_user_meta( (int) $user->ID, 'instascore_email_otp_expires', true );
			$attempts = (int) get_user_meta( (int) $user->ID, 'instascore_email_otp_attempts', true );
			$hash     = (string) get_user_meta( (int) $user->ID, 'instascore_email_otp_hash', true );
			if ( $attempts >= 5 || $expires < time() || '' === $hash || ! wp_check_password( $code, $hash ) ) {
				update_user_meta( (int) $user->ID, 'instascore_email_otp_attempts', $attempts + 1 );
				return Envelope::error( 'instascore_verification_invalid', 'That verification code is invalid or has expired.', array(), 422 );
			}
			update_user_meta( (int) $user->ID, 'instascore_email_verified', '1' );
			delete_user_meta( (int) $user->ID, 'instascore_email_otp_hash' );
			delete_user_meta( (int) $user->ID, 'instascore_email_otp_expires' );
			delete_user_meta( (int) $user->ID, 'instascore_email_otp_attempts' );
			delete_user_meta( (int) $user->ID, 'instascore_email_otp_sent_at' );
			wp_set_current_user( (int) $user->ID );
			wp_set_auth_cookie( (int) $user->ID, true, is_ssl() );
			wp_mail( $email, 'Welcome to InstaScore', "Hi {$user->display_name},\n\nYour email is verified and your InstaScore account is ready.\n\nOpen InstaScore: " . home_url( '/' ) );
			delete_transient( $rate_key );
			return $this->handle( $request );
		}

		if ( 'resend-verification' === $action ) {
			$email = sanitize_email( (string) ( $params['email'] ?? '' ) );
			$user  = $email ? get_user_by( 'email', $email ) : false;
			if ( $user && '0' === (string) get_user_meta( (int) $user->ID, 'instascore_email_verified', true ) ) {
				return $this->send_verification_response( (int) $user->ID, $email );
			}
			return Envelope::success( array( 'verificationRequired' => true, 'email' => $email, 'message' => 'If verification is pending, a new code is on its way.', 'expiresIn' => 600 ) );
		}

		$email = sanitize_email( (string) ( $params['email'] ?? '' ) );
		$user = $email ? get_user_by( 'email', $email ) : false;
		if ( $user ) {
			retrieve_password( $user->user_login );
		}
		return Envelope::success( array( 'message' => 'If an account exists, a password reset email is on its way.' ) );
	}

	private function send_verification_response( int $user_id, string $email, int $status = 200 ): WP_REST_Response {
		$last_sent = (int) get_user_meta( $user_id, 'instascore_email_otp_sent_at', true );
		if ( $last_sent > time() - MINUTE_IN_SECONDS ) {
			return Envelope::error( 'instascore_verification_cooldown', 'Please wait one minute before requesting another code.', array(), 429 );
		}
		$limit_key = 'instascore_otp_' . hash_hmac( 'sha256', strtolower( $email ), wp_salt( 'auth' ) );
		$sent      = (int) get_transient( $limit_key );
		if ( $sent >= 5 ) {
			return Envelope::error( 'instascore_verification_rate_limited', 'Too many verification emails were requested. Try again in an hour.', array(), 429 );
		}
		$code = (string) random_int( 100000, 999999 );
		update_user_meta( $user_id, 'instascore_email_otp_hash', wp_hash_password( $code ) );
		update_user_meta( $user_id, 'instascore_email_otp_expires', time() + 10 * MINUTE_IN_SECONDS );
		update_user_meta( $user_id, 'instascore_email_otp_attempts', 0 );
		update_user_meta( $user_id, 'instascore_email_otp_sent_at', time() );
		set_transient( $limit_key, $sent + 1, HOUR_IN_SECONDS );
		$message = '<p>Use this code to finish creating your InstaScore account:</p>'
			. '<div style="margin:24px 0;padding:18px;border:1px solid #f3c643;border-radius:12px;background:#07192d;color:#fff5d6;font-size:32px;font-weight:900;letter-spacing:.24em;text-align:center">' . esc_html( $code ) . '</div>'
			. '<p>This code expires in <strong>10 minutes</strong>. If you did not create an account, you can safely ignore this email.</p>';
		if ( ! wp_mail( $email, 'Verify your InstaScore email', $message ) ) {
			return Envelope::error( 'instascore_verification_email_failed', 'Your account was created, but the verification email could not be sent. Check the site mail configuration and request another code.', array(), 503 );
		}
		return Envelope::success( array( 'verificationRequired' => true, 'email' => $email, 'message' => 'Enter the six-digit code sent to your email.', 'expiresIn' => 600 ), array(), $status );
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
