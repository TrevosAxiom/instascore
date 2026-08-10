<?php
/**
 * Normalises football provider payloads into internal view models.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Providers;

final class FootballNormalizer {
	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function competitions( array $payload ): array {
		return array_map(
			fn( array $row ): array => array(
				'providerId' => (string) ( $row['id'] ?? $row['league']['id'] ?? '' ),
				'name'       => (string) ( $row['name'] ?? $row['league']['name'] ?? '' ),
				'country'    => (string) ( is_array( $row['country'] ?? null ) ? ( $row['country']['name'] ?? '' ) : ( $row['country'] ?? '' ) ),
				'type'       => 'league',
				'sport'      => 'football',
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
				'code'       => (string) ( $row['code'] ?? $row['team']['code'] ?? '' ),
				'country'    => (string) ( $row['country'] ?? $row['team']['country'] ?? '' ),
				'founded'    => (int) ( $row['founded'] ?? $row['team']['founded'] ?? 0 ),
				'venueName'  => (string) ( $row['venue']['name'] ?? '' ),
				'sport'      => 'football',
			),
			$this->rows( $payload )
		);
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function fixtures( array $payload ): array {
		return array_map(
			fn( array $row ): array => array(
				'providerId'            => (string) ( $row['id'] ?? $row['fixture']['id'] ?? '' ),
				'competitionProviderId' => (string) ( $row['league']['id'] ?? '' ),
				'seasonProviderId'      => (string) ( $row['league']['season'] ?? '' ),
				'homeTeamProviderId'    => (string) ( $row['teams']['home']['id'] ?? '' ),
				'awayTeamProviderId'    => (string) ( $row['teams']['away']['id'] ?? '' ),
				'competitionName'       => (string) ( $row['league']['name'] ?? 'Soccer' ),
				'homeTeamName'          => (string) ( $row['teams']['home']['name'] ?? 'Home' ),
				'awayTeamName'          => (string) ( $row['teams']['away']['name'] ?? 'Away' ),
				'homeTeamLogoUrl'       => (string) ( $row['teams']['home']['logo'] ?? '' ),
				'awayTeamLogoUrl'       => (string) ( $row['teams']['away']['logo'] ?? '' ),
				'homeScore'             => (int) ( $row['goals']['home'] ?? 0 ),
				'awayScore'             => (int) ( $row['goals']['away'] ?? 0 ),
				'kickoffAt'             => (string) ( $row['date'] ?? $row['fixture']['date'] ?? '' ),
				'status'                => ProviderStatusMapper::fixture_status( (string) ( $row['status'] ?? $row['fixture']['status']['short'] ?? '' ) ),
				'statusShort'           => (string) ( $row['status'] ?? $row['fixture']['status']['short'] ?? '' ),
				'elapsed'               => (int) ( $row['fixture']['status']['elapsed'] ?? 0 ),
				'round'                 => (string) ( $row['league']['round'] ?? '' ),
				'venueName'             => (string) ( $row['fixture']['venue']['name'] ?? '' ),
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
			static function ( array $row ): array {
				$player = isset( $row['player'] ) && is_array( $row['player'] ) ? $row['player'] : $row;
				$statistics = isset( $row['statistics'][0] ) && is_array( $row['statistics'][0] ) ? $row['statistics'][0] : array();
				return array(
					'providerId'    => (string) ( $player['id'] ?? '' ),
					'name'          => (string) ( $player['name'] ?? trim( (string) ( $player['firstname'] ?? '' ) . ' ' . (string) ( $player['lastname'] ?? '' ) ) ),
					'firstName'     => (string) ( $player['firstname'] ?? '' ),
					'lastName'      => (string) ( $player['lastname'] ?? '' ),
					'dateOfBirth'   => (string) ( $player['birth']['date'] ?? '' ),
					'nationality'   => (string) ( $player['nationality'] ?? '' ),
					'height'        => (string) ( $player['height'] ?? '' ),
					'weight'        => (string) ( $player['weight'] ?? '' ),
					'photoUrl'      => (string) ( $player['photo'] ?? '' ),
					'teamProviderId'=> (string) ( $statistics['team']['id'] ?? '' ),
					'teamName'      => (string) ( $statistics['team']['name'] ?? '' ),
					'position'      => (string) ( $statistics['games']['position'] ?? '' ),
					'number'        => (int) ( $statistics['games']['number'] ?? 0 ),
					'sport'         => 'football',
				);
			},
			$this->rows( $payload )
		);
	}

	/**
	 * @param array<string,mixed> $payload Provider payload.
	 * @return array<int,array<string,mixed>>
	 */
	public function standings( array $payload ): array {
		$rows = $this->rows( $payload );
		if ( isset( $rows[0]['league']['standings'] ) && is_array( $rows[0]['league']['standings'] ) ) {
			$groups = $rows[0]['league']['standings'];
			$rows = array();
			foreach ( $groups as $group ) {
				if ( is_array( $group ) ) {
					$rows = array_merge( $rows, array_values( array_filter( $group, 'is_array' ) ) );
				}
			}
		}
		return array_map(
			fn( array $row ): array => array(
				'teamProviderId'  => (string) ( $row['team']['id'] ?? $row['team_id'] ?? '' ),
				'teamName'        => (string) ( $row['team']['name'] ?? '' ),
				'teamLogoUrl'     => (string) ( $row['team']['logo'] ?? '' ),
				'position'        => (int) ( $row['rank'] ?? $row['position'] ?? 0 ),
				'played'          => (int) ( $row['all']['played'] ?? $row['played'] ?? 0 ),
				'wins'            => (int) ( $row['all']['win'] ?? $row['wins'] ?? 0 ),
				'draws'           => (int) ( $row['all']['draw'] ?? $row['draws'] ?? 0 ),
				'losses'          => (int) ( $row['all']['lose'] ?? $row['losses'] ?? 0 ),
				'points'          => (int) ( $row['points'] ?? 0 ),
				'pointsFor'       => (int) ( $row['all']['goals']['for'] ?? 0 ),
				'pointsAgainst'   => (int) ( $row['all']['goals']['against'] ?? 0 ),
				'pointDifference' => (int) ( $row['goalsDiff'] ?? 0 ),
			),
			$rows
		);
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
