<?php
/**
 * Normalises basketball provider payloads into internal view models.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Providers;

final class BasketballNormalizer {
	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function competitions( array $payload ): array {
		return array_map(
			fn( array $row ): array => array(
				'providerId' => (string) ( $row['id'] ?? $row['league']['id'] ?? '' ),
				'name'       => (string) ( $row['name'] ?? $row['league']['name'] ?? '' ),
				'country'    => (string) ( $row['country'] ?? $row['country']['name'] ?? '' ),
				'type'       => 'league',
				'sport'      => 'basketball',
			),
			$this->rows( $payload )
		);
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function teams( array $payload ): array {
		return array_map(
			fn( array $row ): array => array(
				'providerId' => (string) ( $row['id'] ?? $row['team']['id'] ?? '' ),
				'name'       => (string) ( $row['name'] ?? $row['team']['name'] ?? '' ),
				'logoUrl'    => (string) ( $row['logo'] ?? $row['team']['logo'] ?? '' ),
				'sport'      => 'basketball',
			),
			$this->rows( $payload )
		);
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function players( array $payload ): array {
		return array_map(
			fn( array $row ): array => array(
				'providerId'     => (string) ( $row['id'] ?? $row['player']['id'] ?? '' ),
				'name'           => (string) ( $row['name'] ?? $row['player']['name'] ?? '' ),
				'teamProviderId' => (string) ( $row['team']['id'] ?? '' ),
				'position'       => (string) ( $row['position'] ?? '' ),
				'sport'          => 'basketball',
			),
			$this->rows( $payload )
		);
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function fixtures( array $payload ): array {
		return array_map( fn( array $row ): array => $this->game( $row ), $this->rows( $payload ) );
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function standings( array $payload ): array {
		return array_map(
			fn( array $row ): array => array(
				'teamProviderId'  => (string) ( $row['team']['id'] ?? $row['team_id'] ?? '' ),
				'position'        => (int) ( $row['rank'] ?? $row['position'] ?? 0 ),
				'played'          => (int) ( $row['games']['played'] ?? $row['played'] ?? 0 ),
				'wins'            => (int) ( $row['games']['win']['total'] ?? $row['wins'] ?? 0 ),
				'losses'          => (int) ( $row['games']['lose']['total'] ?? $row['losses'] ?? 0 ),
				'points'          => (int) ( $row['points'] ?? 0 ),
				'pointsFor'       => (int) ( $row['points_for'] ?? 0 ),
				'pointsAgainst'   => (int) ( $row['points_against'] ?? 0 ),
				'pointDifference' => (int) ( $row['point_difference'] ?? 0 ),
				'sport'           => 'basketball',
			),
			$this->rows( $payload )
		);
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function statistics( array $payload ): array {
		return array_map(
			fn( array $row ): array => array(
				'providerId'     => (string) ( $row['id'] ?? $row['player']['id'] ?? $row['team']['id'] ?? '' ),
				'entityType'     => isset( $row['player'] ) ? 'player' : 'team',
				'teamProviderId' => (string) ( $row['team']['id'] ?? '' ),
				'points'         => (int) ( $row['points'] ?? 0 ),
				'rebounds'       => (int) ( $row['rebounds'] ?? 0 ),
				'assists'        => (int) ( $row['assists'] ?? 0 ),
				'sport'          => 'basketball',
			),
			$this->rows( $payload )
		);
	}

	/**
	 * @param array<string,mixed> $row Provider game row.
	 * @return array<string,mixed>
	 */
	private function game( array $row ): array {
		$periods = $this->period_scores( $row );
		$status_short = (string) ( $row['status']['short'] ?? $row['status'] ?? '' );
		$period = match ( strtoupper( $status_short ) ) {
			'Q1' => 1,
			'Q2', 'HT' => 2,
			'Q3' => 3,
			'Q4' => 4,
			'OT' => 5,
			default => (int) ( $row['period'] ?? 0 ),
		};
		$home    = (int) ( $row['scores']['home']['total'] ?? $row['score']['home'] ?? 0 );
		$away    = (int) ( $row['scores']['away']['total'] ?? $row['score']['away'] ?? 0 );

		return array(
			'providerId'            => (string) ( $row['id'] ?? $row['game']['id'] ?? '' ),
			'competitionProviderId' => (string) ( $row['league']['id'] ?? '' ),
			'competitionName'       => (string) ( $row['league']['name'] ?? 'Basketball' ),
			'seasonProviderId'      => (string) ( $row['league']['season'] ?? $row['season'] ?? '' ),
			'homeTeamProviderId'    => (string) ( $row['teams']['home']['id'] ?? '' ),
			'awayTeamProviderId'    => (string) ( $row['teams']['away']['id'] ?? '' ),
			'homeTeamName'          => (string) ( $row['teams']['home']['name'] ?? 'Home' ),
			'awayTeamName'          => (string) ( $row['teams']['away']['name'] ?? 'Away' ),
			'homeTeamLogoUrl'       => (string) ( $row['teams']['home']['logo'] ?? '' ),
			'awayTeamLogoUrl'       => (string) ( $row['teams']['away']['logo'] ?? '' ),
			'homeScore'             => $home,
			'awayScore'             => $away,
			'kickoffAt'             => (string) ( $row['date'] ?? $row['game']['date'] ?? '' ),
			'status'                => $this->status( (string) ( $row['status']['short'] ?? $row['status'] ?? '' ) ),
			'sport'                 => 'basketball',
			'sportState'            => array(
				'period'          => $period,
				'periodLabel'     => $this->period_label( $period, $status_short ),
				'clock'           => (string) ( $row['status']['timer'] ?? '' ),
				'periodScores'    => $periods,
				'overtimePeriods' => max( 0, count( $periods ) - 4 ),
				'scoreReconciled' => $this->reconciles( $periods, $home, $away ),
			),
		);
	}

	private function status( string $status ): string {
		return match ( strtoupper( $status ) ) {
			'NS', 'SCHEDULED' => 'scheduled',
			'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'LIVE', 'IN_PLAY' => 'live',
			'HT', 'HALFTIME' => 'halftime',
			'FT', 'AOT', 'FINAL' => 'completed',
			'CANC', 'CANCELLED' => 'cancelled',
			'PST', 'POSTPONED' => 'postponed',
			default => 'draft',
		};
	}

	/**
	 * @param array<string,mixed> $row Provider game row.
	 * @return array<int,array{label:string,home:int,away:int}>
	 */
	private function period_scores( array $row ): array {
		$scores = $row['scores'] ?? array();
		$home   = is_array( $scores['home'] ?? null ) ? $scores['home'] : array();
		$away   = is_array( $scores['away'] ?? null ) ? $scores['away'] : array();
		$labels = array(
			array( 'quarter_1', 'q1' ),
			array( 'quarter_2', 'q2' ),
			array( 'quarter_3', 'q3' ),
			array( 'quarter_4', 'q4' ),
			array( 'over_time', 'ot' ),
			array( 'ot2' ),
			array( 'ot3' ),
			array( 'ot4' ),
		);
		$periods = array();

		foreach ( $labels as $index => $aliases ) {
			$home_value = $this->first_period_value( $home, $aliases );
			$away_value = $this->first_period_value( $away, $aliases );
			if ( null === $home_value && null === $away_value ) {
				continue;
			}
			$periods[] = array(
				'label' => $index < 4 ? 'Q' . ( $index + 1 ) : 'OT' . ( 4 === $index ? '' : (string) ( $index - 3 ) ),
				'home'  => (int) ( $home_value ?? 0 ),
				'away'  => (int) ( $away_value ?? 0 ),
			);
		}

		return $periods;
	}

	/** @param array<string,mixed> $scores @param string[] $aliases */
	private function first_period_value( array $scores, array $aliases ): mixed {
		foreach ( $aliases as $alias ) {
			if ( array_key_exists( $alias, $scores ) && null !== $scores[ $alias ] ) {
				return $scores[ $alias ];
			}
		}
		return null;
	}

	/**
	 * @param array<int,array{label:string,home:int,away:int}> $periods Period scores.
	 */
	private function reconciles( array $periods, int $home, int $away ): bool {
		$home_total = array_sum( array_column( $periods, 'home' ) );
		$away_total = array_sum( array_column( $periods, 'away' ) );
		return $home_total === $home && $away_total === $away;
	}

	private function period_label( int $period, string $status ): string {
		$status = strtoupper( $status );
		if ( in_array( $status, array( 'HT', 'HALFTIME' ), true ) ) {
			return 'Halftime';
		}
		if ( $period > 4 ) {
			return 'OT' . ( 5 === $period ? '' : (string) ( $period - 4 ) );
		}
		return $period > 0 ? 'Q' . $period : 'Pregame';
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	private function rows( array $payload ): array {
		$rows = $payload['response'] ?? $payload['data'] ?? $payload;
		return is_array( $rows ) ? array_values( array_filter( $rows, 'is_array' ) ) : array();
	}
}
