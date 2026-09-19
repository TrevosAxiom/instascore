<?php
/** NFL provider normalization tests. @package InstaScore_Platform */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Providers\NflNormalizer;
use PHPUnit\Framework\TestCase;

final class NflNormalizerTest extends TestCase {
	public function test_normalizes_league_and_current_season(): void {
		$items = ( new NflNormalizer() )->competitions(
			array( 'response' => array( array( 'id' => 1, 'name' => 'NFL', 'country' => array( 'name' => 'USA' ), 'logo' => 'nfl.png', 'seasons' => array( array( 'season' => 2025, 'current' => false ), array( 'season' => 2026, 'current' => true ) ) ) ) )
		);
		self::assertSame( '1', $items[0]['providerId'] );
		self::assertSame( '2026', $items[0]['currentSeason'] );
		self::assertSame( 'nfl', $items[0]['sport'] );
	}

	public function test_normalizes_nfl_standing(): void {
		$items = ( new NflNormalizer() )->standings( array( 'response' => array( array( 'position' => 1, 'team' => array( 'id' => 10, 'name' => 'Lagos Hawks' ), 'won' => 8, 'lost' => 2, 'ties' => 1, 'points' => array( 'for' => 240, 'difference' => 80 ) ) ) ) );
		self::assertSame( 11, $items[0]['played'] );
		self::assertSame( 8, $items[0]['wins'] );
		self::assertSame( 80, $items[0]['pointDifference'] );
	}
}
