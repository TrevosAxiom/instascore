<?php
/**
 * Scorekeeper and commissioner permission checks.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Auth;

final class ScoringPermissions {
	public static function manage_scoring(): bool {
		return current_user_can( 'instascore_manage_scoring' )
			|| current_user_can( 'instascore_manage_fixtures' )
			|| current_user_can( 'instascore_manage_competitions' )
			|| current_user_can( 'instascore_manage_leagues' );
	}

	public static function override_scorekeeper_scope(): bool {
		return current_user_can( 'instascore_manage_fixtures' )
			|| current_user_can( 'instascore_manage_competitions' )
			|| current_user_can( 'instascore_manage_leagues' );
	}

	public static function confirm_results(): bool {
		return current_user_can( 'instascore_confirm_results' )
			|| current_user_can( 'instascore_manage_competitions' )
			|| current_user_can( 'instascore_manage_leagues' );
	}
}
