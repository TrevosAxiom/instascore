<?php
/**
 * Team permission tests.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Auth\TeamPermissions;
use PHPUnit\Framework\TestCase;

final class TeamPermissionTest extends TestCase {
	public function test_team_admin_is_scoped_to_assigned_teams(): void {
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_manage_teams' );
		$GLOBALS['instascore_test_user_meta'][7]['instascore_team_assignments'] = array( 'team-a' );

		self::assertTrue( TeamPermissions::manage_team( 'team-a' ) );
		self::assertFalse( TeamPermissions::manage_team( 'team-b' ) );
	}
}
