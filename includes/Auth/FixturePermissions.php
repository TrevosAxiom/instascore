<?php
/**
 * Fixture scheduling capability checks.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Auth;

final class FixturePermissions {
	public static function manage_fixtures(): bool {
		return current_user_can( 'instascore_manage_fixtures' )
			|| current_user_can( 'instascore_manage_competitions' )
			|| current_user_can( 'instascore_manage_leagues' );
	}
}
