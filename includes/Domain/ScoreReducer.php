<?php
/**
 * Authoritative flag-football score reducer.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

final class ScoreReducer {
	/**
	 * @param array<int,array<string,mixed>> $events Events.
	 * @return array{home:int,away:int}
	 */
	public function reduce( array $events ): array {
		$score = array( 'home' => 0, 'away' => 0 );
		foreach ( $events as $event ) {
			if ( ! empty( $event['voided_at'] ) ) {
				continue;
			}
			$side = (string) ( $event['team_side'] ?? '' );
			if ( ! in_array( $side, array( 'home', 'away' ), true ) ) {
				continue;
			}
			$score[ $side ] += max( 0, (int) ( $event['points'] ?? 0 ) );
		}
		return $score;
	}
}
