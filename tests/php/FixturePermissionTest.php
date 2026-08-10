<?php

use InstaScore\Platform\Auth\FixturePermissions;
use PHPUnit\Framework\TestCase;

final class FixturePermissionTest extends TestCase {
	protected function tearDown(): void {
		$GLOBALS['instascore_test_capabilities'] = array();
	}

	public function test_fixture_mutations_require_fixture_or_competition_management(): void {
		$this->assertFalse( FixturePermissions::manage_fixtures() );
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_manage_fixtures' );
		$this->assertTrue( FixturePermissions::manage_fixtures() );
	}
}
