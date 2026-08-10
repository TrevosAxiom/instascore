<?php
/**
 * Deterministic standings and statistics calculator.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

final class StandingsCalculator {
	public const DEFAULT_TIEBREAKERS = array( 'points', 'wins', 'point_difference', 'points_for', 'head_to_head', 'team_name' );

	/**
	 * @param array<int,array<string,mixed>> $fixtures Confirmed fixtures with events.
	 * @param array<string,mixed>            $rules Competition rules.
	 * @return array{standings:array<int,array<string,mixed>>,teamStats:array<string,array<string,int>>,playerStats:array<string,array<string,mixed>>,hash:string}
	 */
	public function calculate( array $fixtures, array $rules = array() ): array {
		usort(
			$fixtures,
			fn( array $a, array $b ): int => array( $a['kickoff_at'] ?? '', (int) ( $a['id'] ?? 0 ) ) <=> array( $b['kickoff_at'] ?? '', (int) ( $b['id'] ?? 0 ) )
		);

		$table        = array();
		$team_stats   = array();
		$player_stats = array();
		$form         = array();
		$win_points   = (int) ( $rules['win_points'] ?? 3 );
		$draw_points  = (int) ( $rules['draw_points'] ?? 1 );
		$loss_points  = (int) ( $rules['loss_points'] ?? 0 );
		$tiebreakers  = $this->tiebreakers( $rules );

		foreach ( $fixtures as $fixture ) {
			$home_id = (int) $fixture['home_team_id'];
			$away_id = (int) $fixture['away_team_id'];
			$this->ensure_team( $table, $home_id, (string) ( $fixture['home_team_name'] ?? 'Home' ) );
			$this->ensure_team( $table, $away_id, (string) ( $fixture['away_team_name'] ?? 'Away' ) );

			$score = array( 'home' => 0, 'away' => 0 );
			$events = $fixture['events'] ?? array();
			usort( $events, fn( array $a, array $b ): int => (int) ( $a['sequence_number'] ?? 0 ) <=> (int) ( $b['sequence_number'] ?? 0 ) );
			foreach ( $events as $event ) {
				if ( ! empty( $event['voided_at'] ) ) {
					continue;
				}
				$side    = (string) ( $event['team_side'] ?? '' );
				$team_id = 'home' === $side ? $home_id : ( 'away' === $side ? $away_id : (int) ( $event['team_id'] ?? 0 ) );
				$type    = (string) ( $event['event_type'] ?? '' );
				if ( in_array( $side, array( 'home', 'away' ), true ) ) {
					$score[ $side ] += max( 0, (int) ( $event['points'] ?? 0 ) );
				}
				if ( $team_id > 0 ) {
					$this->increment_stat( $team_stats, (string) $team_id, $this->stat_key( $type ) );
				}
				$player_id = (int) ( $event['primary_player_id'] ?? 0 );
				if ( $player_id > 0 ) {
					$key = (string) $player_id;
					$player_stats[ $key ]['player_id'] = $player_id;
					$player_stats[ $key ]['team_id']   = $team_id;
					$this->increment_stat( $player_stats, $key, $this->stat_key( $type ) );
				}
			}

			$this->apply_result( $table[ $home_id ], $score['home'], $score['away'], $win_points, $draw_points, $loss_points );
			$this->apply_result( $table[ $away_id ], $score['away'], $score['home'], $win_points, $draw_points, $loss_points );
			$form[ $home_id ][] = $this->result_code( $score['home'], $score['away'] );
			$form[ $away_id ][] = $this->result_code( $score['away'], $score['home'] );
		}

		foreach ( $table as $team_id => &$row ) {
			$row['form'] = implode( '', array_slice( $form[ $team_id ] ?? array(), -5 ) );
		}
		unset( $row );

		$standings = array_values( $table );
		usort( $standings, fn( array $a, array $b ): int => $this->compare( $a, $b, $tiebreakers ) );
		foreach ( $standings as $index => &$row ) {
			$row['position']         = $index + 1;
			$row['tiebreaker_order'] = $tiebreakers;
		}
		unset( $row );

		$hash = hash( 'sha256', wp_json_encode( array( $standings, $team_stats, $player_stats ) ) );
		return array( 'standings' => $standings, 'teamStats' => $team_stats, 'playerStats' => $player_stats, 'hash' => $hash );
	}

	private function ensure_team( array &$table, int $team_id, string $name ): void {
		if ( isset( $table[ $team_id ] ) ) {
			return;
		}
		$table[ $team_id ] = array(
			'team_id'          => $team_id,
			'team_name'        => $name,
			'played'           => 0,
			'wins'             => 0,
			'draws'            => 0,
			'losses'           => 0,
			'points'           => 0,
			'points_for'       => 0,
			'points_against'   => 0,
			'point_difference' => 0,
			'form'             => '',
		);
	}

	private function apply_result( array &$row, int $for, int $against, int $win, int $draw, int $loss ): void {
		++$row['played'];
		$row['points_for']       += $for;
		$row['points_against']   += $against;
		$row['point_difference'] += $for - $against;
		if ( $for > $against ) {
			++$row['wins'];
			$row['points'] += $win;
		} elseif ( $for === $against ) {
			++$row['draws'];
			$row['points'] += $draw;
		} else {
			++$row['losses'];
			$row['points'] += $loss;
		}
	}

	private function compare( array $a, array $b, array $order ): int {
		foreach ( $order as $key ) {
			if ( 'head_to_head' === $key ) {
				continue;
			}
			if ( 'team_name' === $key ) {
				$result = strcmp( (string) $a['team_name'], (string) $b['team_name'] );
				if ( 0 !== $result ) {
					return $result;
				}
				continue;
			}
			$result = (int) ( $b[ $key ] ?? 0 ) <=> (int) ( $a[ $key ] ?? 0 );
			if ( 0 !== $result ) {
				return $result;
			}
		}
		return (int) $a['team_id'] <=> (int) $b['team_id'];
	}

	private function tiebreakers( array $rules ): array {
		$order = $rules['tiebreakers'] ?? self::DEFAULT_TIEBREAKERS;
		return is_array( $order ) ? array_values( array_intersect( $order, self::DEFAULT_TIEBREAKERS ) ) : self::DEFAULT_TIEBREAKERS;
	}

	private function stat_key( string $type ): string {
		return match ( $type ) {
			'passing_touchdown' => 'passing_touchdowns',
			'rushing_touchdown' => 'rushing_touchdowns',
			'receiving_touchdown' => 'receiving_touchdowns',
			'interception' => 'interceptions',
			'safety' => 'safeties',
			'flag_pull' => 'flag_pulls',
			'penalty' => 'penalties',
			'player_of_the_match' => 'player_of_the_match',
			default => $type . 's',
		};
	}

	private function increment_stat( array &$stats, string $entity, string $key ): void {
		if ( '' === $key ) {
			return;
		}
		$stats[ $entity ][ $key ] = 1 + (int) ( $stats[ $entity ][ $key ] ?? 0 );
	}

	private function result_code( int $for, int $against ): string {
		return $for > $against ? 'W' : ( $for === $against ? 'D' : 'L' );
	}
}
