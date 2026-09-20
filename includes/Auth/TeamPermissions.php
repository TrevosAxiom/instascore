<?php
/**
 * Team capability and assignment checks.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Auth;

use InstaScore\Platform\Repositories\TeamRepository;
use InstaScore\Platform\Repositories\PlayerRepository;
use InstaScore\Platform\Repositories\RegistrationRepository;

final class TeamPermissions {
	public static function manage_teams(): bool {
		return current_user_can( 'instascore_manage_leagues' ) || current_user_can( 'instascore_manage_teams' );
	}

	public static function manage_players(): bool {
		return current_user_can( 'instascore_manage_leagues' ) || current_user_can( 'instascore_manage_players' );
	}

	public static function manage_venues(): bool {
		return current_user_can( 'instascore_manage_leagues' ) || current_user_can( 'instascore_manage_venues' );
	}

	public static function manage_officials(): bool {
		return current_user_can( 'instascore_manage_leagues' ) || current_user_can( 'instascore_manage_officials' );
	}

	public static function manage_team( ?string $team_uuid = null ): bool {
		if ( current_user_can( 'instascore_manage_leagues' ) ) {
			return true;
		}
		if ( ! current_user_can( 'instascore_manage_teams' ) ) {
			return false;
		}
		if ( null === $team_uuid ) {
			return true;
		}
		$assigned = get_user_meta( get_current_user_id(), 'instascore_team_assignments', true );
		return is_array( $assigned ) && in_array( $team_uuid, $assigned, true );
	}

	public static function manage_registration_for_team_id( int $team_id ): bool {
		if ( current_user_can( 'instascore_manage_leagues' ) ) {
			return true;
		}
		if ( ! current_user_can( 'instascore_manage_teams' ) && ! current_user_can( 'instascore_manage_players' ) ) {
			return false;
		}
		global $wpdb;
		$team = ( new TeamRepository( $wpdb, 'teams' ) )->find_by_id( $team_id );
		return null !== $team && self::manage_team( (string) $team['uuid'] );
	}

	public static function manage_player( string $player_uuid ): bool {
		if ( current_user_can( 'instascore_manage_leagues' ) ) return true;
		if ( ! current_user_can( 'instascore_manage_players' ) ) return false;
		global $wpdb;
		$player = ( new PlayerRepository( $wpdb, 'players' ) )->find_by_uuid( $player_uuid );
		if ( null === $player ) return false;
		$registrations = ( new RegistrationRepository( $wpdb, 'team_registrations' ) )->history_for_player( (int) $player['id'] );
		foreach ( $registrations as $registration ) {
			if ( 'active' === $registration['status'] && self::manage_team( (string) $registration['team_uuid'] ) ) return true;
		}
		return false;
	}
}
