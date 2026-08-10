<?php
/**
 * Team capability and assignment checks.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Auth;

use InstaScore\Platform\Repositories\TeamRepository;

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
}
