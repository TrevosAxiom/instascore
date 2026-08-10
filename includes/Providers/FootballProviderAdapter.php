<?php
/**
 * Approved football HTTP provider adapter.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Providers;

use InstaScore\Platform\Support\Config;
use RuntimeException;

final class FootballProviderAdapter implements SportsProviderInterface {
	public function getCompetitions( array $filters ): array {
		return $this->request_scoped( '/leagues', $filters );
	}

	public function getFixtures( array $filters ): array {
		// A date query already identifies a bounded match day. API-Football requires
		// a season when league and date are combined, so fetch the day once and then
		// enforce the configured competition allow-list locally.
		if ( isset( $filters['date'] ) && isset( $filters['leagueIds'] ) && is_array( $filters['leagueIds'] ) ) {
			$allowed_leagues = array_values( array_filter( array_map( 'strval', $filters['leagueIds'] ) ) );
			unset( $filters['leagueIds'] );
			$payload = $this->request( '/fixtures', $filters );
			if ( isset( $payload['response'] ) && is_array( $payload['response'] ) ) {
				$payload['response'] = array_values( array_filter(
					$payload['response'],
					static fn( array $fixture ): bool => in_array( (string) ( $fixture['league']['id'] ?? '' ), $allowed_leagues, true )
				) );
			}
			return $payload;
		}
		return $this->request_scoped( '/fixtures', $filters );
	}

	public function getLiveFixtures( array $filters ): array {
		$league_ids = isset( $filters['leagueIds'] ) && is_array( $filters['leagueIds'] ) ? array_values( array_filter( array_map( 'strval', $filters['leagueIds'] ) ) ) : array();
		unset( $filters['leagueIds'] );
		if ( array() === $league_ids ) {
			return array( 'response' => array() );
		}
		return $this->request( '/fixtures', array_merge( $filters, array( 'live' => implode( '-', $league_ids ) ) ) );
	}

	public function getStandings( string $competition_id, string $season_id ): array {
		return $this->request( '/standings', array( 'league' => $competition_id, 'season' => $season_id ) );
	}

	public function getTeams( array $filters ): array {
		return $this->request_scoped( '/teams', $filters );
	}

	public function getPlayers( array $filters ): array {
		return $this->request_scoped( '/players', $filters );
	}

	public function getStatistics( array $filters ): array {
		$path = isset( $filters['fixtureId'] ) || isset( $filters['fixture'] ) ? '/fixtures/statistics' : '/teams/statistics';
		if ( isset( $filters['fixtureId'] ) ) {
			$filters['fixture'] = $filters['fixtureId'];
			unset( $filters['fixtureId'] );
		}
		return $this->request_scoped( $path, $filters );
	}

	public function getFixtureEvents( string $fixture_id ): array {
		return $this->request( '/fixtures/events', array( 'fixture' => $fixture_id ) );
	}

	public function getFixtureLineups( string $fixture_id ): array {
		return $this->request( '/fixtures/lineups', array( 'fixture' => $fixture_id ) );
	}

	public function getFixtureStatistics( string $fixture_id ): array {
		return $this->request( '/fixtures/statistics', array( 'fixture' => $fixture_id ) );
	}

	/**
	 * @param array<string,mixed> $query Query args.
	 * @return array<string,mixed>
	 */
	private function request( string $path, array $query ): array {
		$key = Config::football_provider_api_key();
		if ( '' === $key ) {
			throw new RuntimeException( 'Football provider API key is not configured.' );
		}

		$query = $this->provider_query( $query );
		$response = wp_remote_get(
			add_query_arg( array_map( 'rawurlencode', $query ), Config::football_provider_base_url() . $path ),
			array(
				'timeout' => 15,
				'headers' => array( 'x-apisports-key' => $key ),
			)
		);

		if ( is_wp_error( $response ) ) {
			throw new RuntimeException( $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( 429 === $code ) {
			throw new RuntimeException( 'Football provider rate limit reached.' );
		}
		if ( $code < 200 || $code >= 300 ) {
			throw new RuntimeException( 'Football provider request failed.' );
		}

		$payload = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( is_array( $payload ) && ! empty( $payload['errors'] ) ) {
			throw new RuntimeException( 'API-Football rejected the request: ' . ( wp_json_encode( $payload['errors'] ) ?: 'unknown provider error' ) );
		}
		return is_array( $payload ) ? $payload : array();
	}

	/**
	 * API-Football accepts one league per request. Fan configured league IDs out
	 * into individual requests and merge their responses for one admin action.
	 *
	 * @param array<string,mixed> $filters Internal filters.
	 * @return array<string,mixed>
	 */
	private function request_scoped( string $path, array $filters ): array {
		$league_ids = isset( $filters['leagueIds'] ) && is_array( $filters['leagueIds'] ) ? $filters['leagueIds'] : array();
		unset( $filters['leagueIds'] );
		if ( isset( $filters['league'] ) || isset( $filters['leagueId'] ) || array() === $league_ids ) {
			return $this->request( $path, $filters );
		}

		$merged = array( 'response' => array() );
		$first_error = null;
		$successful_requests = 0;
		foreach ( $league_ids as $league_id ) {
			try {
				$payload = $this->request( $path, array_merge( $filters, array( 'league' => (string) $league_id ) ) );
				++$successful_requests;
			} catch ( RuntimeException $error ) {
				$first_error ??= $error;
				continue;
			}
			if ( isset( $payload['response'] ) && is_array( $payload['response'] ) ) {
				$merged['response'] = array_merge( $merged['response'], $payload['response'] );
			}
		}
		if ( 0 === $successful_requests && null !== $first_error ) {
			throw $first_error;
		}
		return $merged;
	}

	/**
	 * @param array<string,mixed> $query Internal filter names.
	 * @return array<string,string>
	 */
	private function provider_query( array $query ): array {
		$aliases = array(
			'leagueId'  => 'league',
			'teamId'    => 'team',
			'fixtureId' => 'id',
		);
		$allowed = array( 'id', 'ids', 'fixture', 'live', 'date', 'league', 'season', 'team', 'last', 'next', 'from', 'to', 'round', 'status', 'venue', 'timezone', 'page', 'search', 'country', 'code', 'type', 'current' );
		$clean = array();
		foreach ( $query as $key => $value ) {
			$key = $aliases[ $key ] ?? $key;
			if ( ! in_array( $key, $allowed, true ) || null === $value || '' === $value || array() === $value ) {
				continue;
			}
			$clean[ $key ] = is_array( $value ) ? implode( '-', array_map( 'strval', $value ) ) : (string) $value;
		}
		return $clean;
	}
}
