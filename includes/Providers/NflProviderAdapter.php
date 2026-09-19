<?php
/** API-American-Football adapter. @package InstaScore_Platform */
namespace InstaScore\Platform\Providers;

use InstaScore\Platform\Support\Config;
use RuntimeException;

final class NflProviderAdapter implements SportsProviderInterface {
	public function getCompetitions( array $filters ): array { return $this->scoped( '/leagues', $filters, 'id' ); }
	public function getFixtures( array $filters ): array { unset( $filters['from'], $filters['to'], $filters['next'], $filters['last'], $filters['source'], $filters['cadence'] ); return $this->scoped( '/games', $filters, 'league' ); }
	public function getLiveFixtures( array $filters ): array { $filters['date'] = wp_date( 'Y-m-d', null, new \DateTimeZone( 'Africa/Lagos' ) ); return $this->getFixtures( $filters ); }
	public function getStandings( string $competition_id, string $season_id ): array { return $this->request( '/standings', array( 'league' => $competition_id, 'season' => $season_id ) ); }
	public function getTeams( array $filters ): array { return $this->scoped( '/teams', $filters, 'league' ); }
	public function getPlayers( array $filters ): array { return $this->scoped( '/players', $filters, 'league' ); }
	public function getStatistics( array $filters ): array { return $this->request( '/games/statistics/teams', $filters ); }

	private function request( string $path, array $query ): array {
		$key = Config::nfl_provider_api_key();
		if ( '' === $key ) throw new RuntimeException( 'NFL provider API key is not configured.' );
		$query = array_map( static fn( $value ): string => is_array( $value ) ? implode( ',', array_map( 'strval', $value ) ) : (string) $value, $query );
		$response = wp_remote_get( add_query_arg( array_map( 'rawurlencode', $query ), Config::nfl_provider_base_url() . $path ), array( 'timeout' => 15, 'headers' => array( 'x-apisports-key' => $key ) ) );
		if ( is_wp_error( $response ) ) throw new RuntimeException( $response->get_error_message() );
		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( 429 === $code ) throw new RuntimeException( 'NFL provider rate limit reached.' );
		if ( $code < 200 || $code >= 300 ) throw new RuntimeException( 'NFL provider request failed.' );
		$payload = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( is_array( $payload ) && ! empty( $payload['errors'] ) ) throw new RuntimeException( 'API-American-Football rejected the request: ' . ( wp_json_encode( $payload['errors'] ) ?: 'unknown error' ) );
		return is_array( $payload ) ? $payload : array();
	}

	private function scoped( string $path, array $filters, string $key ): array {
		$ids = array_values( array_filter( array_map( 'strval', (array) ( $filters['leagueIds'] ?? array() ) ) ) );
		unset( $filters['leagueIds'] );
		if ( array() === $ids ) return array( 'response' => array() );
		$merged = array( 'response' => array() );
		foreach ( $ids as $id ) {
			$payload = $this->request( $path, array_merge( $filters, array( $key => $id ) ) );
			$merged['response'] = array_merge( $merged['response'], is_array( $payload['response'] ?? null ) ? $payload['response'] : array() );
		}
		return $merged;
	}
}
