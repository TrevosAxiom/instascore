<?php

use InstaScore\Platform\Domain\ScoreReducer;
use PHPUnit\Framework\TestCase;

final class ScoreReducerTest extends TestCase {
	public function test_reduces_only_non_voided_scoring_events(): void {
		$score = ( new ScoreReducer() )->reduce(
			array(
				array( 'team_side' => 'home', 'points' => 6, 'voided_at' => null ),
				array( 'team_side' => 'home', 'points' => 1, 'voided_at' => '2026-08-01 18:00:00' ),
				array( 'team_side' => 'away', 'points' => 2, 'voided_at' => null ),
				array( 'team_side' => null, 'points' => 6, 'voided_at' => null ),
			)
		);

		$this->assertSame( array( 'home' => 6, 'away' => 2 ), $score );
	}
}
