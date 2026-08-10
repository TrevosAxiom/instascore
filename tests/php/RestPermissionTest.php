<?php
/**
 * REST permission tests.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Tests;

use InstaScore\Platform\REST\AdminCompetitionController;
use PHPUnit\Framework\TestCase;
use WP_REST_Request;

final class RestPermissionTest extends TestCase {
	protected function tearDown(): void {
		$GLOBALS['instascore_test_capabilities'] = array();
		$GLOBALS['instascore_test_user_meta']    = array();
	}

	public function test_unauthorised_user_cannot_mutate(): void {
		self::assertFalse( ( new AdminCompetitionController() )->can_manage_leagues() );
	}

	public function test_assigned_manager_can_manage_only_assigned_competition(): void {
		$uuid                                    = '00000000-0000-4000-8000-000000000011';
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_manage_competitions' );
		$GLOBALS['instascore_test_user_meta'][7]['instascore_competition_assignments'] = array( $uuid );
		$controller = new AdminCompetitionController();
		self::assertTrue( $controller->can_manage_requested_competition( new WP_REST_Request( array( 'uuid' => $uuid ) ) ) );
		self::assertFalse( $controller->can_manage_requested_competition( new WP_REST_Request( array( 'uuid' => '00000000-0000-4000-8000-000000000012' ) ) ) );
	}
}
