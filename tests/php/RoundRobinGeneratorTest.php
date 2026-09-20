<?php

use InstaScore\Platform\Domain\RoundRobinGenerator;
use PHPUnit\Framework\TestCase;

final class RoundRobinGeneratorTest extends TestCase {
	public function test_generates_every_pair_once_for_single_round_robin(): void {
		$rounds = ( new RoundRobinGenerator() )->generate( array( 1, 2, 3, 4 ) );
		$this->assertCount( 3, $rounds );
		$this->assertSame( 6, array_sum( array_map( 'count', $rounds ) ) );
		$pairs = array();
		foreach ( $rounds as $round ) {
			$this->assertCount( 4, array_unique( array_merge( array_column( $round, 'home' ), array_column( $round, 'away' ) ) ) );
			foreach ( $round as $pair ) {
				$teams = array( $pair['home'], $pair['away'] );
				sort( $teams );
				$pairs[] = implode( '-', $teams );
			}
		}
		$this->assertCount( 6, array_unique( $pairs ) );
	}

	public function test_handles_byes_and_reverse_legs(): void {
		$rounds = ( new RoundRobinGenerator() )->generate( array( 10, 20, 30 ), true );
		$this->assertCount( 6, $rounds );
		$this->assertSame( 6, array_sum( array_map( 'count', $rounds ) ) );
		$this->assertNotContains( 0, array_merge( ...array_map( static fn( array $round ): array => array_merge( array_column( $round, 'home' ), array_column( $round, 'away' ) ), $rounds ) ) );
	}
}
