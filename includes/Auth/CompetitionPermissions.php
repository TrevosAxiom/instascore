<?php
/**
 * Competition capability and assignment checks.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Auth;

final class CompetitionPermissions {
	public static function manage_leagues(): bool {
		return current_user_can( 'instascore_manage_leagues' );
	}

	public static function manage_competition( ?string $competition_uuid = null ): bool {
		if ( current_user_can( 'instascore_manage_leagues' ) ) {
			return true;
		}
		if ( ! current_user_can( 'instascore_manage_competitions' ) ) {
			return false;
		}
		if ( null === $competition_uuid ) {
			return true;
		}
		$assigned = get_user_meta( get_current_user_id(), 'instascore_competition_assignments', true );
		return is_array( $assigned ) && in_array( $competition_uuid, $assigned, true );
	}
}
