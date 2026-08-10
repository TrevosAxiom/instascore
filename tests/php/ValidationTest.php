<?php
/**
 * Date and competition relationship validation tests.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Domain\CompetitionValidator;
use InstaScore\Platform\Domain\ValidationException;
use PHPUnit\Framework\TestCase;

final class ValidationTest extends TestCase {
	public function test_accepts_flag_football_competition_and_valid_season(): void {
		$validator = new CompetitionValidator();
		$result    = $validator->competition(
			array(
				'name'      => 'CFFL Championship',
				'type'      => 'league',
				'sportUuid' => '00000000-0000-4000-8000-000000000001',
				'rules'     => array( 'points_win' => 3 ),
			)
		);
		self::assertSame( 'league', $result['type'] );
		self::assertSame(
			'2026-09-30',
			$validator->season(
				array(
					'name'      => '2026 Season',
					'startDate' => '2026-03-01',
					'endDate'   => '2026-09-30',
				)
			)['end_date']
		);
	}

	public function test_rejects_inverted_season_dates(): void {
		$this->expectException( ValidationException::class );
		( new CompetitionValidator() )->season(
			array(
				'name'      => 'Bad Season',
				'startDate' => '2026-10-01',
				'endDate'   => '2026-01-01',
			)
		);
	}

	public function test_rejects_invalid_relationship_identifier(): void {
		$this->expectException( ValidationException::class );
		( new CompetitionValidator() )->competition(
			array(
				'name'      => 'League',
				'type'      => 'league',
				'sportUuid' => '123',
				'rules'     => array(),
			)
		);
	}
}
