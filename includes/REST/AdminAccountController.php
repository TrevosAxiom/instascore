<?php
/**
 * Protected day-to-day account administration.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Support\UserIdentity;
use WP_REST_Request;
use WP_REST_Response;

final class AdminAccountController {
	private const ROLES = array(
		'instascore_league_administrator',
		'instascore_competition_manager',
		'instascore_team_administrator',
		'instascore_scorekeeper',
		'instascore_match_official',
		'editor',
	);

	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/admin/accounts',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'index' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'create' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
			)
		);
	}

	public function can_manage(): bool {
		return current_user_can( 'instascore_manage_users' );
	}

	public function index(): WP_REST_Response {
		$users = get_users(
			array(
				'role__in' => self::ROLES,
				'orderby'  => 'display_name',
				'order'    => 'ASC',
			)
		);
		return Envelope::success( array_map( array( $this, 'present' ), $users ) );
	}

	public function create( WP_REST_Request $request ): WP_REST_Response {
		$input      = (array) $request->get_json_params();
		$first_name = sanitize_text_field( (string) ( $input['firstName'] ?? '' ) );
		$last_name  = sanitize_text_field( (string) ( $input['lastName'] ?? '' ) );
		$email      = sanitize_email( (string) ( $input['email'] ?? '' ) );
		$role       = sanitize_key( (string) ( $input['role'] ?? '' ) );
		$official   = sanitize_key( (string) ( $input['officialType'] ?? '' ) );

		if ( '' === $first_name || '' === $last_name || ! is_email( $email ) ) {
			return Envelope::error( 'instascore_account_invalid', 'Enter a first name, last name and valid email address.', array(), 422 );
		}
		if ( ! in_array( $role, self::ROLES, true ) ) {
			return Envelope::error( 'instascore_account_role', 'Select an approved InstaScore role.', array(), 422 );
		}
		if ( email_exists( $email ) ) {
			return Envelope::error( 'instascore_account_exists', 'An account already uses this email address.', array(), 409 );
		}

		$username = sanitize_user( strstr( $email, '@', true ), true );
		$base     = '' === $username ? 'instascore-user' : $username;
		$suffix   = 1;
		while ( username_exists( $username ) ) {
			$username = $base . $suffix;
			++$suffix;
		}
		$user_id = wp_insert_user(
			array(
				'user_login'   => $username,
				'user_pass'    => wp_generate_password( 32, true, true ),
				'user_email'   => $email,
				'first_name'   => $first_name,
				'last_name'    => $last_name,
				'display_name' => trim( $first_name . ' ' . $last_name ),
				'role'         => $role,
			)
		);
		if ( is_wp_error( $user_id ) ) {
			return Envelope::error( 'instascore_account_failed', $user_id->get_error_message(), array(), 422 );
		}
		if ( 'instascore_match_official' === $role ) {
			update_user_meta( $user_id, 'instascore_official_type', in_array( $official, array( 'referee', 'umpire', 'table_official', 'commissioner' ), true ) ? $official : 'referee' );
		}
		wp_send_new_user_notifications( $user_id, 'user' );
		$user = get_user_by( 'id', $user_id );
		$data = $this->present( $user );
		global $wpdb;
		( new AuditRepository( $wpdb ) )->record( 'user_account', UserIdentity::uuid( $user_id ), 'created', null, $data );
		return Envelope::success( array_merge( $data, array( 'invitationSent' => true ) ), array(), 201 );
	}

	private function present( $user ): array {
		return array(
			'uuid'         => UserIdentity::uuid( (int) $user->ID ),
			'displayName'  => $user->display_name,
			'email'        => $user->user_email,
			'role'         => (string) ( $user->roles[0] ?? '' ),
			'officialType' => (string) get_user_meta( $user->ID, 'instascore_official_type', true ),
		);
	}
}
