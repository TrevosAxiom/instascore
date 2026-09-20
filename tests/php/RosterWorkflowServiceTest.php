<?php
/** Team-manager roster workflow tests. @package InstaScore_Platform */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\RosterWorkflowService;
use PHPUnit\Framework\TestCase;
use wpdb;

final class RosterWorkflowServiceTest extends TestCase {
	private wpdb $database;
	private RosterWorkflowService $service;

	protected function setUp(): void {
		$this->database = new wpdb();
		$this->service = new RosterWorkflowService( $this->database );
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_manage_leagues' );
		$this->database->rows['wp_instascore_teams']['00000000-0000-4000-8000-000000000011'] = array( 'id' => 1, 'uuid' => '00000000-0000-4000-8000-000000000011' );
		$this->database->rows['wp_instascore_players']['00000000-0000-4000-8000-000000000020'] = array( 'id' => 2, 'uuid' => '00000000-0000-4000-8000-000000000020' );
		$this->database->rows['wp_instascore_seasons']['00000000-0000-4000-8000-000000000030'] = array( 'id' => 3, 'uuid' => '00000000-0000-4000-8000-000000000030' );
	}

	protected function tearDown(): void {
		$GLOBALS['instascore_test_capabilities'] = array();
	}

	public function test_registration_request_is_queued_without_mutating_the_roster(): void {
		$result = $this->service->submit( $this->input() );
		self::assertSame( 'pending', $result['status'] );
		self::assertCount( 1, $this->database->rows['wp_instascore_roster_requests'] );
		self::assertArrayNotHasKey( 'wp_instascore_team_registrations', $this->database->rows );
		self::assertCount( 1, $this->database->rows['wp_instascore_audit_logs'] );
	}

	public function test_unsupported_request_type_is_rejected(): void {
		$this->expectException( ValidationException::class );
		$this->service->submit( array_merge( $this->input(), array( 'requestType' => 'delete' ) ) );
	}

	/** @return array<string,mixed> */
	private function input(): array {
		return array( 'requestType' => 'register', 'teamUuid' => '00000000-0000-4000-8000-000000000011', 'playerUuid' => '00000000-0000-4000-8000-000000000020', 'seasonUuid' => '00000000-0000-4000-8000-000000000030', 'jerseyNumber' => 12, 'positionCode' => 'WR', 'eligibilityStatus' => 'eligible' );
	}
}
