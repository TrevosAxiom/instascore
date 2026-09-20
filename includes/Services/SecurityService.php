<?php
/** Security events, login throttling, sessions and capability audits. @package InstaScore_Platform */

namespace InstaScore\Platform\Services;

use WP_Error;
use WP_User;
use wpdb;

final class SecurityService {
	private const MAX_ATTEMPTS = 5;
	private const WINDOW = 15 * MINUTE_IN_SECONDS;

	public function __construct( private readonly wpdb $database ) {}
	public static function create(): self { global $wpdb; return new self( $wpdb ); }

	public function pre_authenticate( mixed $user, string $username ): mixed {
		if ( $user instanceof WP_User || $user instanceof WP_Error || '' === trim( $username ) ) return $user;
		$key = $this->attempt_key( $username );
		$state = get_transient( $key );
		if ( is_array( $state ) && (int) ( $state['count'] ?? 0 ) >= self::MAX_ATTEMPTS ) {
			$this->record( 'login_blocked', 'warning', null, $username, array( 'windowSeconds' => self::WINDOW ) );
			return new WP_Error( 'instascore_login_throttled', __( 'Too many sign-in attempts. Please wait 15 minutes and try again.', 'instascore-platform' ) );
		}
		return $user;
	}

	public function login_failed( string $username ): void {
		$key = $this->attempt_key( $username );
		$state = get_transient( $key );
		$count = is_array( $state ) ? (int) ( $state['count'] ?? 0 ) : 0;
		set_transient( $key, array( 'count' => $count + 1, 'firstAt' => $state['firstAt'] ?? time() ), self::WINDOW );
		$this->record( 'login_failed', $count + 1 >= self::MAX_ATTEMPTS ? 'warning' : 'info', null, $username, array( 'attempt' => $count + 1 ) );
	}

	public function login_succeeded( string $username, WP_User $user ): void {
		delete_transient( $this->attempt_key( $username ) );
		$this->record( 'login_succeeded', 'info', (int) $user->ID, $username );
		$this->limit_privileged_sessions( $user );
	}

	/** @return array<string,mixed> */
	public function capability_audit(): array {
		$expected = self::expected_roles();
		$roles = array();
		$total_missing = 0;
		foreach ( $expected as $role_name => $capabilities ) {
			$role = get_role( $role_name );
			$missing = array();
			if ( null === $role ) {
				$missing = $capabilities;
			} else {
				foreach ( $capabilities as $capability ) if ( ! $role->has_cap( $capability ) ) $missing[] = $capability;
			}
			$total_missing += count( $missing );
			$roles[ $role_name ] = array( 'exists' => null !== $role, 'missingCapabilities' => $missing );
		}
		$report = array( 'status' => 0 === $total_missing ? 'healthy' : 'attention', 'missingCount' => $total_missing, 'roles' => $roles, 'generatedAt' => gmdate( DATE_ATOM ) );
		update_option( 'instascore_security_capability_audit', $report, false );
		return $report;
	}

	/** Add required capabilities only; never remove administrator-defined access. */
	public function repair_capabilities(): array {
		$added = array();
		foreach ( self::expected_roles() as $role_name => $capabilities ) {
			$role = get_role( $role_name );
			if ( null === $role ) continue;
			foreach ( $capabilities as $capability ) {
				if ( ! $role->has_cap( $capability ) ) { $role->add_cap( $capability ); $added[] = "{$role_name}:{$capability}"; }
			}
		}
		$this->record( 'capabilities_repaired', 'info', get_current_user_id(), '', array( 'addedCount' => count( $added ) ) );
		return array( 'status' => 'completed', 'added' => $added, 'audit' => $this->capability_audit() );
	}

	public function record( string $event_type, string $severity = 'info', ?int $user_id = null, string $identity = '', array $context = array() ): void {
		$this->database->insert( $this->database->prefix . 'instascore_security_events', array(
			'uuid' => wp_generate_uuid4(), 'event_type' => sanitize_key( $event_type ), 'severity' => sanitize_key( $severity ), 'user_id' => $user_id,
			'identity_hash' => '' === $identity ? null : hash_hmac( 'sha256', strtolower( trim( $identity ) ), wp_salt( 'auth' ) ),
			'ip_hash' => hash_hmac( 'sha256', (string) ( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ), wp_salt( 'auth' ) ),
			'user_agent_hash' => hash( 'sha256', (string) ( $_SERVER['HTTP_USER_AGENT'] ?? 'unknown' ) ),
			'context_json' => wp_json_encode( $context ) ?: '{}', 'created_at' => gmdate( 'Y-m-d H:i:s' ),
		) );
	}

	private function attempt_key( string $username ): string {
		$identity = strtolower( trim( $username ) ) . '|' . (string) ( $_SERVER['REMOTE_ADDR'] ?? 'unknown' );
		return 'instascore_login_attempt_' . hash_hmac( 'sha256', $identity, wp_salt( 'auth' ) );
	}

	private function limit_privileged_sessions( WP_User $user ): void {
		if ( ! array_intersect( array_keys( array_filter( (array) $user->allcaps ) ), array( 'instascore_access_admin', 'instascore_access_operations' ) ) ) return;
		if ( ! class_exists( '\WP_Session_Tokens' ) ) return;
		$manager = \WP_Session_Tokens::get_instance( (int) $user->ID );
		$sessions = $manager->get_all();
		if ( count( $sessions ) <= 3 ) return;
		uasort( $sessions, static fn( array $a, array $b ): int => (int) ( $a['login'] ?? 0 ) <=> (int) ( $b['login'] ?? 0 ) );
		foreach ( array_slice( array_keys( $sessions ), 0, count( $sessions ) - 3 ) as $verifier ) $manager->destroy( $verifier );
		$this->record( 'privileged_sessions_trimmed', 'info', (int) $user->ID, '', array( 'removed' => count( $sessions ) - 3 ) );
	}

	/** @return array<string,array<int,string>> */
	private static function expected_roles(): array {
		return array(
			'administrator' => array( 'instascore_access_admin', 'instascore_access_operations', 'instascore_manage_users' ),
			'instascore_league_administrator' => array( 'instascore_access_admin', 'instascore_manage_competitions', 'instascore_manage_fixtures', 'instascore_manage_users' ),
			'instascore_competition_manager' => array( 'instascore_access_admin', 'instascore_manage_competitions', 'instascore_manage_fixtures' ),
			'instascore_scorekeeper' => array( 'instascore_access_operations', 'instascore_manage_scoring' ),
			'instascore_team_administrator' => array( 'instascore_access_admin', 'instascore_manage_teams', 'instascore_manage_players' ),
		);
	}
}
