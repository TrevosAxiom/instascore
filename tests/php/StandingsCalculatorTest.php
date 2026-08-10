<?php

use InstaScore\Platform\Domain\StandingsCalculator;
use PHPUnit\Framework\TestCase;

final class StandingsCalculatorTest extends TestCase {
	public function test_calculates_table_and_player_statistics_from_confirmed_event_stream(): void {
		$fixtures = array(
				array(
					'id'             => 1,
					'kickoff_at'     => '2026-08-01 18:00:00',
					'home_team_id'   => 10,
					'away_team_id'   => 20,
					'home_team_name' => 'Lightning',
					'away_team_name' => 'Rush',
					'events'         => array(
						array( 'sequence_number' => 1, 'event_type' => 'passing_touchdown', 'team_side' => 'home', 'points' => 6, 'primary_player_id' => 100, 'voided_at' => null ),
						array( 'sequence_number' => 2, 'event_type' => 'safety', 'team_side' => 'away', 'points' => 2, 'primary_player_id' => 200, 'voided_at' => null ),
					),
				),
			);
		$result = ( new StandingsCalculator() )->calculate( $fixtures );

		$this->assertSame( 10, $result['standings'][0]['team_id'] );
		$this->assertSame( 3, $result['standings'][0]['points'] );
		$this->assertSame( 6, $result['standings'][0]['points_for'] );
		$this->assertSame( 1, $result['playerStats']['100']['passing_touchdowns'] );
		$this->assertSame( $result['hash'], ( new StandingsCalculator() )->calculate( array_reverse( $fixtures ) )['hash'] );
	}

	public function test_tiebreakers_are_stable_and_deterministic(): void {
		$fixtures = array(
			array( 'id' => 2, 'kickoff_at' => '2026-08-02', 'home_team_id' => 2, 'away_team_id' => 1, 'home_team_name' => 'Beta', 'away_team_name' => 'Alpha', 'events' => array() ),
		);
		$result = ( new StandingsCalculator() )->calculate( $fixtures, array( 'win_points' => 4, 'draw_points' => 2 ) );

		$this->assertSame( 'Alpha', $result['standings'][0]['team_name'] );
		$this->assertSame( 'Beta', $result['standings'][1]['team_name'] );
	}
}
