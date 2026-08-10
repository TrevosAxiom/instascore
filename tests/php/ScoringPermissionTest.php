<?php

use InstaScore\Platform\Auth\ScoringPermissions;
use PHPUnit\Framework\TestCase;

final class ScoringPermissionTest extends TestCase {
	protected function tearDown(): void {
		$GLOBALS['instascore_test_capabilities'] = array();
	}

	public function test_scorekeeper_permissions_are_capability_backed(): void {
		$this->assertFalse( ScoringPermissions::manage_scoring() );
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_manage_scoring' );
		$this->assertTrue( ScoringPermissions::manage_scoring() );
		$this->assertFalse( ScoringPermissions::override_scorekeeper_scope() );
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_manage_fixtures' );
		$this->assertTrue( ScoringPermissions::override_scorekeeper_scope() );
	}

	public function test_result_confirmation_is_separate(): void {
		$this->assertFalse( ScoringPermissions::confirm_results() );
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_confirm_results' );
		$this->assertTrue( ScoringPermissions::confirm_results() );
	}
}
