<?php
/**
 * Milestone 3 service tests.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\TeamPlayerService;
use PHPUnit\Framework\TestCase;
use wpdb;

final class TeamPlayerServiceTest extends TestCase {
	private wpdb $database;
	private TeamPlayerService $service;

	protected function setUp(): void {
		$this->database = new wpdb();
		$this->service  = new TeamPlayerService( $this->database, new \InstaScore\Platform\Domain\TeamPlayerValidator() );
		$GLOBALS['instascore_test_capabilities'] = array( 'instascore_manage_leagues' );
		$this->seed();
	}

	public function test_registration_history_does_not_write_team_to_player(): void {
		$created = $this->service->register_player( $this->registration_input( 12 ) );

		self::assertSame( 1, $created['team_id'] );
		self::assertArrayNotHasKey( 'team_id', $this->database->rows['wp_instascore_players']['00000000-0000-4000-8000-000000000020'] );
		self::assertCount( 1, $this->database->rows['wp_instascore_audit_logs'] );
	}

	public function test_duplicate_active_registration_is_rejected(): void {
		$this->service->register_player( $this->registration_input( 12 ) );

		$this->expectException( ValidationException::class );
		$this->service->register_player( $this->registration_input( 13 ) );
	}

	public function test_jersey_conflict_is_rejected(): void {
		$this->service->register_player( $this->registration_input( 12 ) );
		$this->database->rows['wp_instascore_players']['00000000-0000-4000-8000-000000000021'] = array(
			'id' => 5,
			'uuid' => '00000000-0000-4000-8000-000000000021',
		);

		$this->expectException( ValidationException::class );
		$this->service->register_player(
			array_merge(
				$this->registration_input( 12 ),
				array( 'playerUuid' => '00000000-0000-4000-8000-000000000021' )
			)
		);
	}

	public function test_csv_preview_reports_row_level_errors(): void {
		$result = $this->service->preview_registration_import(
			array(
				$this->registration_input( 12 ),
				$this->registration_input( 12 ),
				array(),
			)
		);

		self::assertSame( 1, $result['valid'] );
		self::assertCount( 2, $result['errors'] );
	}

	public function test_upload_validation_rejects_large_or_unsafe_images(): void {
		$this->expectException( ValidationException::class );
		$this->service->create_player(
			array(
				'firstName' => 'Ada',
				'lastName' => 'Okafor',
				'sportUuid' => '00000000-0000-4000-8000-000000000010',
				'photo' => array(
					'mimeType' => 'image/svg+xml',
					'sizeBytes' => 64,
				),
			)
		);
	}

	/**
	 * @return array<string,mixed>
	 */
	private function registration_input( int $jersey ): array {
		return array(
			'teamUuid' => '00000000-0000-4000-8000-000000000011',
			'playerUuid' => '00000000-0000-4000-8000-000000000020',
			'seasonUuid' => '00000000-0000-4000-8000-000000000030',
			'jerseyNumber' => $jersey,
			'positionCode' => 'wr',
			'eligibilityStatus' => 'eligible',
		);
	}

	private function seed(): void {
		$this->database->rows['wp_instascore_sports']['00000000-0000-4000-8000-000000000010'] = array(
			'id' => 10,
			'uuid' => '00000000-0000-4000-8000-000000000010',
		);
		$this->database->rows['wp_instascore_teams']['00000000-0000-4000-8000-000000000011'] = array(
			'id' => 1,
			'uuid' => '00000000-0000-4000-8000-000000000011',
		);
		$this->database->rows['wp_instascore_players']['00000000-0000-4000-8000-000000000020'] = array(
			'id' => 2,
			'uuid' => '00000000-0000-4000-8000-000000000020',
		);
		$this->database->rows['wp_instascore_seasons']['00000000-0000-4000-8000-000000000030'] = array(
			'id' => 3,
			'uuid' => '00000000-0000-4000-8000-000000000030',
		);
	}
}
