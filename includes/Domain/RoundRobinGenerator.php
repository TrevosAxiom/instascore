<?php
/**
 * Deterministic round-robin pairing generator.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

final class RoundRobinGenerator {
	/**
	 * @param int[] $team_ids Team IDs.
	 * @return array<int,array<int,array{home:int,away:int}>>
	 */
	public function generate( array $team_ids, bool $double_round = false ): array {
		$teams = array_values( array_unique( array_map( 'intval', $team_ids ) ) );
		if ( count( $teams ) < 2 ) {
			throw new ValidationException( array( 'teams' => 'At least two teams are required to generate fixtures.' ) );
		}
		if ( 1 === count( $teams ) % 2 ) {
			$teams[] = 0;
		}
		$count  = count( $teams );
		$rounds = array();
		for ( $round = 0; $round < $count - 1; ++$round ) {
			$pairs = array();
			for ( $index = 0; $index < $count / 2; ++$index ) {
				$left  = $teams[ $index ];
				$right = $teams[ $count - 1 - $index ];
				if ( 0 === $left || 0 === $right ) {
					continue;
				}
				$pairs[] = 0 === ( $round + $index ) % 2 ? array( 'home' => $left, 'away' => $right ) : array( 'home' => $right, 'away' => $left );
			}
			$rounds[] = $pairs;
			$fixed = array_shift( $teams );
			$last  = array_pop( $teams );
			array_unshift( $teams, $fixed, $last );
		}
		if ( $double_round ) {
			$reverse = array_map(
				static fn( array $pairs ): array => array_map( static fn( array $pair ): array => array( 'home' => $pair['away'], 'away' => $pair['home'] ), $pairs ),
				$rounds
			);
			$rounds = array_merge( $rounds, $reverse );
		}
		return $rounds;
	}
}
