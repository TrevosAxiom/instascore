<?php
/**
 * Approved basketball HTTP provider adapter.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Providers;

use InstaScore\Platform\Support\Config;
use RuntimeException;

final class BasketballProviderAdapter implements SportsProviderInterface {
	public function getCompetitions( array $filters ): array {
		return $this->request_scoped( '/leagues', $filters, 'id' );
	}

	public function getFixtures( array $filters ): array {
		// The v1 games endpoint scopes by league rather than date ranges. Fetch the
		// configured leagues once and let the service retain only the next 30 days.
		unset( $filters['from'], $filters['to'], $filters['next'], $filters['last'], $filters['cadence'], $filters['source'] );
		return $this->request_scoped( '/games', $filters, 'league' );
	}

	public function getLiveFixtures( array $filters ): array {
		// API-Basketball v1 has no `live` query parameter. Fetch the local match day
		// and let the normalizer select in-progress statuses.
		$league_ids = isset( $filters['leagueIds'] ) && is_array( $filters['leagueIds'] ) ? array_values( array_filter( array_map( 'strval', $filters['leagueIds'] ) ) ) : array();
		unset( $filters['leagueIds'], $filters['source'], $filters['cadence'], $filters['live'] );
		if ( array() === $league_ids ) {
			return array( 'response' => array() );
		}
		$filters['date']     = wp_date( 'Y-m-d', null, new \DateTimeZone( 'Africa/Lagos' ) );
		$filters['timezone'] = 'Africa/Lagos';
		$merged = array( 'response' => array() );
		foreach ( $league_ids as $league_id ) {
			$payload = $this->request( '/games', array_merge( $filters, array( 'league' => $league_id ) ) );
			if ( isset( $payload['response'] ) && is_array( $payload['response'] ) ) {
				$merged['response'] = array_merge( $merged['response'], $payload['response'] );
			}
		}
		return $merged;
	}

	public function getStandings( string $competition_id, string $season_id ): array {
		return $this->request( '/standings', array( 'league' => $competition_id, 'season' => $season_id ) );
	}

	public function getTeams( array $filters ): array {
		return $this->request_scoped( '/teams', $filters, 'league' );
	}

	public function getPlayers( array $filters ): array {
		return $this->request( '/players', $filters );
	}

	public function getStatistics( array $filters ): array {
		return $this->request( '/statistics', $filters );
	}

	/**
	 * @param array<string,mixed> $query Query args.
	 * @return array<string,mixed>
	 */
	private function request( string $path, array $query ): array {
		$key = Config::basketball_provider_api_key();
		if ( '' === $key ) {
			throw new RuntimeException( 'Basketball provider API key is not configured.' );
		}

		$query = array_map( static fn( $value ): string => is_array( $value ) ? implode( ',', array_map( 'strval', $value ) ) : (string) $value, $query );
		$response = wp_remote_get(
			add_query_arg( array_map( 'rawurlencode', $query ), Config::basketball_provider_base_url() . $path ),
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
			throw new RuntimeException( 'Basketball provider rate limit reached.' );
		}
		if ( $code < 200 || $code >= 300 ) {
			throw new RuntimeException( 'Basketball provider request failed.' );
		}

		$payload = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( is_array( $payload ) && ! empty( $payload['errors'] ) ) {
			$error_detail = wp_json_encode( $payload['errors'] ) ?: 'unknown provider error';
			if ( str_contains( strtolower( $error_detail ), 'request limit' ) || str_contains( strtolower( $error_detail ), 'rate limit' ) ) {
				throw new RuntimeException( 'Basketball provider rate limit reached: ' . $error_detail );
			}
			throw new RuntimeException( 'API-Basketball rejected the request: ' . $error_detail );
		}
		return is_array( $payload ) ? $payload : array();
	}

	/**
	 * API-Basketball accepts one league per request. Fan out the saved allow-list
	 * and merge responses without ever broadening to an unconfigured league.
	 *
	 * @param array<string,mixed> $filters Internal filters.
	 */
	private function request_scoped( string $path, array $filters, string $provider_key ): array {
		$league_ids = isset( $filters['leagueIds'] ) && is_array( $filters['leagueIds'] ) ? array_values( array_filter( array_map( 'strval', $filters['leagueIds'] ) ) ) : array();
		unset( $filters['leagueIds'] );
		if ( array() === $league_ids ) {
			return $this->request( $path, $filters );
		}
		$merged = array( 'response' => array() );
		$first_error = null;
		$successful_requests = 0;
		foreach ( $league_ids as $league_id ) {
			try {
				$payload = $this->request( $path, array_merge( $filters, array( $provider_key => $league_id ) ) );
				++$successful_requests;
			} catch ( RuntimeException $error ) {
				// A quota failure applies to the API account, not just this league. Stop
				// immediately instead of wasting one rejected request per remaining ID.
				if ( str_contains( strtolower( $error->getMessage() ), 'rate limit' ) || str_contains( strtolower( $error->getMessage() ), 'request limit' ) ) {
					throw $error;
				}
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
}
