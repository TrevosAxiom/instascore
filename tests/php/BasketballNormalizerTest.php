<?php

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Providers\BasketballNormalizer;
use PHPUnit\Framework\TestCase;

final class BasketballNormalizerTest extends TestCase {
	public function test_quarter_scores_reconcile_with_full_score(): void {
		$games = ( new BasketballNormalizer() )->fixtures(
			array(
				'response' => array(
					array(
						'id'     => 10,
						'period' => 5,
						'status' => array( 'short' => 'OT' ),
						'teams'  => array(
							'home' => array( 'id' => 1, 'name' => 'Lagos Hoops' ),
							'away' => array( 'id' => 2, 'name' => 'Abuja Nets' ),
						),
						'scores' => array(
							'home' => array( 'q1' => 20, 'q2' => 25, 'q3' => 22, 'q4' => 25, 'ot' => 12, 'total' => 104 ),
							'away' => array( 'q1' => 21, 'q2' => 24, 'q3' => 20, 'q4' => 27, 'ot' => 9, 'total' => 101 ),
						),
					),
				),
			)
		);

		$this->assertSame( 'live', $games[0]['status'] );
		$this->assertSame( 'OT', $games[0]['sportState']['periodLabel'] );
		$this->assertSame( 1, $games[0]['sportState']['overtimePeriods'] );
		$this->assertTrue( $games[0]['sportState']['scoreReconciled'] );
		$this->assertArrayNotHasKey( 'scores', $games[0] );
	}

	public function test_mismatched_quarter_total_is_flagged(): void {
		$games = ( new BasketballNormalizer() )->fixtures(
			array(
				array(
					'id'     => 11,
					'status' => 'FT',
					'scores' => array(
						'home' => array( 'q1' => 10, 'q2' => 10, 'q3' => 10, 'q4' => 10, 'total' => 41 ),
						'away' => array( 'q1' => 9, 'q2' => 9, 'q3' => 9, 'q4' => 9, 'total' => 36 ),
					),
				),
			)
		);

		$this->assertFalse( $games[0]['sportState']['scoreReconciled'] );
	}
}
