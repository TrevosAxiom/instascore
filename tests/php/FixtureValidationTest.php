<?php

use InstaScore\Platform\Domain\FixtureValidator;
use InstaScore\Platform\Domain\ValidationException;
use PHPUnit\Framework\TestCase;

final class FixtureValidationTest extends TestCase {
	public function test_rejects_same_home_and_away_team(): void {
		$this->expectException( ValidationException::class );
		( new FixtureValidator() )->fixture(
			array(
				'competitionUuid' => '00000000-0000-4000-8000-000000000001',
				'seasonUuid'      => '00000000-0000-4000-8000-000000000002',
				'homeTeamUuid'    => '00000000-0000-4000-8000-000000000003',
				'awayTeamUuid'    => '00000000-0000-4000-8000-000000000003',
				'kickoffAt'       => '2026-08-01T18:00',
			)
		);
	}

	public function test_converts_kickoff_to_utc(): void {
		$data = ( new FixtureValidator() )->fixture(
			array(
				'competitionUuid' => '00000000-0000-4000-8000-000000000001',
				'seasonUuid'      => '00000000-0000-4000-8000-000000000002',
				'homeTeamUuid'    => '00000000-0000-4000-8000-000000000003',
				'awayTeamUuid'    => '00000000-0000-4000-8000-000000000004',
				'kickoffAt'       => '2026-08-01T18:00',
				'timezone'        => 'Africa/Lagos',
			)
		);

		$this->assertSame( '2026-08-01 17:00:00', $data['kickoffAtUtc'] );
	}

	public function test_rejects_invalid_status_transition(): void {
		$this->expectException( ValidationException::class );
		( new FixtureValidator() )->transition( 'draft', 'confirmed' );
	}
}
