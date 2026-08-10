<?php
/**
 * Football provider sync orchestration.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Providers\BasketballNormalizer;
use InstaScore\Platform\Providers\BasketballProviderAdapter;
use InstaScore\Platform\Providers\FootballNormalizer;
use InstaScore\Platform\Providers\FootballProviderAdapter;
use InstaScore\Platform\Providers\SportsProviderInterface;
use InstaScore\Platform\Repositories\ProviderRepository;
use InstaScore\Platform\Support\Config;
use Throwable;

final class ProviderSyncService {
	public function __construct(
		private readonly ProviderRepository $repository,
		private readonly SportsProviderInterface $provider,
		private readonly FootballNormalizer|BasketballNormalizer $normalizer,
		private readonly string $sport,
		private readonly string $provider_name,
		private readonly string $base_url,
		private readonly bool $configured
	) {}

	public static function create(): self {
		return self::create_for_sport( 'football' );
	}

	public static function create_for_sport( string $sport ): self {
		global $wpdb;
		if ( 'basketball' === $sport ) {
			return new self(
				new ProviderRepository( $wpdb ),
				new BasketballProviderAdapter(),
				new BasketballNormalizer(),
				'basketball',
				Config::basketball_provider_name(),
				Config::basketball_provider_base_url(),
				'' !== Config::basketball_provider_api_key()
			);
		}

		return new self(
			new ProviderRepository( $wpdb ),
			new FootballProviderAdapter(),
			new FootballNormalizer(),
			'football',
			Config::football_provider_name(),
			Config::football_provider_base_url(),
			'' !== Config::football_provider_api_key()
		);
	}

	/**
	 * @param array<string,mixed> $filters Sync filters.
	 * @return array<string,mixed>
	 */
	public function sync( string $sync_type, array $filters = array(), bool $dry_run = false ): array {
		$started = gmdate( 'Y-m-d H:i:s' );
		$league_ids = 'basketball' === $this->sport ? Config::basketball_provider_league_ids() : Config::football_provider_league_ids();
		$cooldown_until = (int) get_option( "instascore_provider_{$this->sport}_cooldown_until", 0 );
		if ( ! $dry_run && $cooldown_until > time() ) {
			return array(
				'status'     => 'rate_limited',
				'dryRun'     => false,
				'count'      => 0,
				'preview'    => array(),
				'mappings'   => array(),
				'retryAfter' => $cooldown_until - time(),
				'error'      => 'Provider polling is paused until its API quota reset window.',
			);
		}

		try {
			$filters = $this->scope_to_configured_leagues( $filters, $league_ids, $sync_type );
			if ( 'upcoming' === $sync_type && ! isset( $filters['from'], $filters['to'] ) ) {
				$filters['next'] = max( 1, min( 50, (int) ( $filters['next'] ?? 20 ) ) );
			}
			if ( 'previous' === $sync_type ) {
				$filters['last'] = max( 1, min( 50, (int) ( $filters['last'] ?? 20 ) ) );
			}
			$payload = match ( $sync_type ) {
				'competitions' => $this->normalizer->competitions( $this->provider->getCompetitions( $filters ) ),
				'teams'        => $this->normalizer->teams( $this->provider->getTeams( $filters ) ),
				'fixtures'     => $this->normalizer->fixtures( $this->provider->getFixtures( $filters ) ),
				'upcoming'     => $this->upcoming_fixtures( $filters ),
				'previous'     => $this->normalizer->fixtures( $this->provider->getFixtures( $filters ) ),
				'live'         => $this->live_fixtures( $filters ),
				'players'      => method_exists( $this->normalizer, 'players' ) ? $this->normalizer->players( $this->provider->getPlayers( $filters ) ) : array(),
				'statistics'   => method_exists( $this->normalizer, 'statistics' ) ? $this->normalizer->statistics( $this->provider->getStatistics( $filters ) ) : array(),
				'standings'    => $this->normalizer->standings( $this->provider->getStandings( (string) ( $filters['league'] ?? $filters['leagueId'] ?? $filters['competition'] ?? '' ), (string) ( $filters['season'] ?? '' ) ) ),
				default        => throw new \InvalidArgumentException( 'Unsupported provider sync operation.' ),
			};
			$mappings = array();
			foreach ( $payload as $entity ) {
				$mappings[] = $this->repository->upsert_mapping( $this->provider_name, $this->sport, $sync_type, $entity, null, $dry_run );
			}
			if ( ! $dry_run ) {
				$this->repository->store_snapshot( $this->provider_name, $this->sport, $sync_type, $payload );
				delete_option( "instascore_provider_{$this->sport}_cooldown_until" );
			}

			$log = $this->repository->record_sync_log(
				array(
					'provider'  => $this->provider_name,
					'syncType'  => $sync_type,
					'dryRun'    => $dry_run,
					'status'    => 'succeeded',
					'filters'   => $filters,
					'preview'   => array_slice( $payload, 0, 20 ),
					'startedAt' => $started,
				)
			);

			return array( 'status' => 'succeeded', 'dryRun' => $dry_run, 'count' => count( $payload ), 'preview' => array_slice( $payload, 0, 20 ), 'mappings' => $mappings, 'log' => $log );
		} catch ( Throwable $error ) {
			$is_rate_limited = $this->is_rate_limit_error( $error->getMessage() );
			$retry_after = $is_rate_limited ? $this->quota_retry_seconds( $error->getMessage() ) : 60;
			if ( $is_rate_limited && ! $dry_run ) {
				update_option( "instascore_provider_{$this->sport}_cooldown_until", time() + $retry_after, false );
			}
			$log = $this->repository->record_sync_log(
				array(
					'provider'            => $this->provider_name,
					'syncType'            => $sync_type,
					'dryRun'              => $dry_run,
					'status'              => $is_rate_limited ? 'rate_limited' : 'failed',
					'filters'             => $filters,
					'preview'             => array(),
					'errorCode'           => 'provider_sync_failed',
					'errorMessage'        => $error->getMessage(),
					'retryAfterSeconds'   => $retry_after,
					'startedAt'           => $started,
				)
			);
			return array( 'status' => $log['status'], 'dryRun' => $dry_run, 'count' => 0, 'preview' => array(), 'error' => $error->getMessage(), 'log' => $log );
		}
	}

	private function is_rate_limit_error( string $message ): bool {
		$message = strtolower( $message );
		return str_contains( $message, 'rate limit' ) || str_contains( $message, 'request limit' ) || str_contains( $message, 'quota' );
	}

	private function quota_retry_seconds( string $message ): int {
		if ( str_contains( strtolower( $message ), 'for the day' ) ) {
			$tomorrow = new \DateTimeImmutable( 'tomorrow 00:05:00', new \DateTimeZone( 'UTC' ) );
			return max( 300, $tomorrow->getTimestamp() - time() );
		}
		return 300;
	}

	/** @param array<string,mixed> $filters */
	private function upcoming_fixtures( array $filters ): array {
		$fixtures = $this->normalizer->fixtures( $this->provider->getFixtures( $filters ) );
		$from = strtotime( (string) ( $filters['from'] ?? wp_date( 'Y-m-d' ) ) . ' 00:00:00' );
		$to   = strtotime( (string) ( $filters['to'] ?? wp_date( 'Y-m-d', time() + ( 30 * DAY_IN_SECONDS ) ) ) . ' 23:59:59' );
		return array_values( array_filter( $fixtures, static function ( array $fixture ) use ( $from, $to ): bool {
			$kickoff = strtotime( (string) ( $fixture['kickoffAt'] ?? '' ) );
			return false !== $kickoff && false !== $from && false !== $to && $kickoff >= $from && $kickoff <= $to && in_array( (string) ( $fixture['status'] ?? '' ), array( 'scheduled', 'postponed', 'draft' ), true );
		} ) );
	}

	/** @param array<string,mixed> $filters */
	private function live_fixtures( array $filters ): array {
		$fixtures = $this->normalizer->fixtures( $this->provider->getLiveFixtures( $filters ) );
		$allowed_leagues = array_map( 'strval', (array) ( $filters['leagueIds'] ?? array() ) );
		$fixtures = array_values(
			array_filter(
				$fixtures,
				static fn( array $fixture ): bool => in_array( (string) ( $fixture['competitionProviderId'] ?? '' ), $allowed_leagues, true )
			)
		);
		if ( 'basketball' !== $this->sport ) {
			return $fixtures;
		}
		return array_values(
			array_filter(
				$fixtures,
				static fn( array $fixture ): bool => in_array( (string) ( $fixture['status'] ?? '' ), array( 'live', 'halftime' ), true )
			)
		);
	}

	/**
	 * Restrict provider polling to the league IDs explicitly saved by an administrator.
	 *
	 * @param array<string,mixed> $filters Requested filters.
	 * @param array<int,string>   $configured_ids Saved allow-list.
	 * @return array<string,mixed>
	 */
	private function scope_to_configured_leagues( array $filters, array $configured_ids, string $sync_type ): array {
		$configured_ids = array_values( array_unique( array_filter( array_map( 'strval', $configured_ids ) ) ) );
		if ( 'live' === $sync_type && array() === $configured_ids ) {
			throw new \InvalidArgumentException( 'No competition IDs are configured for provider live polling.' );
		}
		$requested_ids = isset( $filters['leagueIds'] ) && is_array( $filters['leagueIds'] ) ? array_map( 'strval', $filters['leagueIds'] ) : $configured_ids;
		$filters['leagueIds'] = array_values( array_intersect( $requested_ids, $configured_ids ) );
		foreach ( array( 'league', 'leagueId', 'competition' ) as $key ) {
			if ( isset( $filters[ $key ] ) && ! in_array( (string) $filters[ $key ], $configured_ids, true ) ) {
				throw new \InvalidArgumentException( 'Requested competition ID is not in the configured provider allow-list.' );
			}
		}
		return $filters;
	}

	/**
	 * @return array<string,mixed>
	 */
	public function health(): array {
		return array(
			'provider'        => $this->provider_name,
			'sport'           => $this->sport,
			'configured'      => $this->configured,
			'baseUrl'         => $this->base_url,
			'secretExposed'   => false,
			'leagueIds'       => 'basketball' === $this->sport ? Config::basketball_provider_league_ids() : Config::football_provider_league_ids(),
			'schedules'       => array(
				'live'      => 'every_30_seconds_for_live_fixtures',
				'nearStart' => 'every_5_minutes_within_2_hours',
				'upcoming'  => 'every_12_hours_for_next_30_days',
				'completed' => 'twice_daily_until_confirmed',
			),
			'conflicts'       => $this->repository->conflicts( $this->sport ),
			'recentSyncLogs'  => $this->repository->recent_logs( $this->provider_name ),
		);
	}

	/**
	 * @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null}
	 */
	public function cached_live(): array {
		return $this->repository->latest_preview( $this->provider_name, 'live' );
	}

	/**
	 * Refresh stale live data on demand. This makes public polling resilient when
	 * WP-Cron is delayed, while the transient prevents a visitor stampede from
	 * consuming provider quota.
	 *
	 * @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null}
	 */
	public function poll_live_if_stale(): array {
		$cached  = $this->cached_live();
		$enabled = (bool) get_option( "instascore_provider_{$this->sport}_polling_enabled", false );
		if ( ! $this->configured || ! $enabled ) {
			return $cached;
		}

		$interval = max( 15, min( 3600, (int) get_option( "instascore_provider_{$this->sport}_live_interval_seconds", 60 ) ) );
		$updated  = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		if ( false !== $updated && $updated > time() - $interval ) {
			return $cached;
		}

		$lock = "instascore_{$this->sport}_live_poll_lock";
		if ( false !== get_transient( $lock ) ) {
			return $cached;
		}
		set_transient( $lock, '1', max( 15, min( 60, $interval ) ) );
		try {
			$this->sync( 'live', array( 'source' => 'stale_public_poll' ), false );
			return $this->cached_live();
		} finally {
			delete_transient( $lock );
		}
	}

	/**
	 * @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null}
	 */
	public function cached_matches( string $period ): array {
		$period = in_array( $period, array( 'live', 'upcoming', 'previous' ), true ) ? $period : 'live';
		return $this->repository->latest_preview( $this->provider_name, $period );
	}

	/**
	 * Return one match day from persistent storage, fetching it from the provider
	 * only when that day has never been cached (or its empty marker has expired).
	 *
	 * @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null}
	 */
	public function matches_for_date( string $period, string $date ): array {
		$period = 'previous' === $period ? 'previous' : 'upcoming';
		$date_object = \DateTimeImmutable::createFromFormat( '!Y-m-d', $date );
		if ( false === $date_object || $date_object->format( 'Y-m-d' ) !== $date ) {
			return array( 'items' => array(), 'lastKnownAt' => null );
		}

		$cache_key = 'matches_' . str_replace( '-', '_', $date );
		$cached = $this->repository->latest_preview( $this->provider_name, $cache_key );
		$updated = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		$empty_lifetime = 15 * MINUTE_IN_SECONDS;
		if ( null !== $cached['lastKnownAt'] && ( ! empty( $cached['items'] ) || ( false !== $updated && $updated > time() - $empty_lifetime ) ) ) {
			return array( 'items' => $this->filter_period( $cached['items'], $period ), 'lastKnownAt' => $cached['lastKnownAt'] );
		}

		// Reuse the broad database snapshots before spending an external API call.
		$broad_items = array();
		foreach ( array( 'upcoming', 'previous', 'live' ) as $stored_period ) {
			$snapshot = $this->cached_matches( $stored_period );
			foreach ( $snapshot['items'] as $item ) {
				if ( $date === substr( (string) ( $item['kickoffAt'] ?? '' ), 0, 10 ) ) {
					$broad_items[ (string) ( $item['providerId'] ?? wp_json_encode( $item ) ) ] = $item;
				}
			}
		}
		if ( array() !== $broad_items ) {
			$items = array_values( $broad_items );
			$this->repository->store_snapshot( $this->provider_name, $this->sport, $cache_key, $items );
			return array( 'items' => $this->filter_period( $items, $period ), 'lastKnownAt' => gmdate( 'Y-m-d H:i:s' ) );
		}

		$enabled = (bool) get_option( "instascore_provider_{$this->sport}_polling_enabled", false );
		if ( ! $this->configured || ! $enabled ) {
			return array( 'items' => array(), 'lastKnownAt' => $cached['lastKnownAt'] );
		}

		$lock = "instascore_{$this->sport}_{$cache_key}_poll_lock";
		if ( false !== get_transient( $lock ) ) {
			return array( 'items' => $this->filter_period( $cached['items'], $period ), 'lastKnownAt' => $cached['lastKnownAt'] );
		}
		set_transient( $lock, '1', 90 );
		try {
			$league_ids = 'basketball' === $this->sport ? Config::basketball_provider_league_ids() : Config::football_provider_league_ids();
			$filters = $this->scope_to_configured_leagues(
				array( 'date' => $date, 'timezone' => 'Africa/Lagos', 'source' => 'public_date_cache_miss' ),
				$league_ids,
				'fixtures'
			);
			$items = $this->normalizer->fixtures( $this->provider->getFixtures( $filters ) );
			$items = array_values( array_filter( $items, static fn( array $item ): bool => $date === substr( (string) ( $item['kickoffAt'] ?? '' ), 0, 10 ) ) );
			$this->repository->store_snapshot( $this->provider_name, $this->sport, $cache_key, $items );
			return array( 'items' => $this->filter_period( $items, $period ), 'lastKnownAt' => gmdate( 'Y-m-d H:i:s' ) );
		} catch ( Throwable $error ) {
			$this->repository->record_sync_log( array(
				'provider' => $this->provider_name, 'syncType' => $cache_key, 'status' => 'failed',
				'filters' => array( 'date' => $date ), 'errorCode' => 'provider_date_fetch_failed',
				'errorMessage' => $error->getMessage(), 'startedAt' => gmdate( 'Y-m-d H:i:s' ),
			) );
			return array( 'items' => array(), 'lastKnownAt' => $cached['lastKnownAt'] );
		} finally {
			delete_transient( $lock );
		}
	}

	/** @param array<int,array<string,mixed>> $items */
	private function filter_period( array $items, string $period ): array {
		$statuses = 'previous' === $period
			? array( 'completed', 'confirmed', 'cancelled' )
			: array( 'draft', 'scheduled', 'postponed' );
		return array_values( array_filter( $items, static fn( array $item ): bool => in_array( (string) ( $item['status'] ?? '' ), $statuses, true ) ) );
	}

	/**
	 * Refresh the public upcoming cache when WP-Cron has not populated it yet or
	 * the twice-daily snapshot is stale.
	 *
	 * @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null}
	 */
	public function poll_upcoming_if_stale(): array {
		$cached  = $this->cached_matches( 'upcoming' );
		$enabled = (bool) get_option( "instascore_provider_{$this->sport}_polling_enabled", false );
		if ( ! $this->configured || ! $enabled ) {
			return $cached;
		}
		$updated = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		if ( false !== $updated && $updated > time() - ( 12 * HOUR_IN_SECONDS ) ) {
			return $cached;
		}
		$lock = "instascore_{$this->sport}_upcoming_poll_lock";
		if ( false !== get_transient( $lock ) ) {
			return $cached;
		}
		set_transient( $lock, '1', 90 );
		try {
			$this->sync(
				'upcoming',
				array(
					'source' => 'stale_public_upcoming_poll',
					'from'   => wp_date( 'Y-m-d' ),
					'to'     => wp_date( 'Y-m-d', time() + ( 30 * DAY_IN_SECONDS ) ),
				),
				false
			);
			return $this->cached_matches( 'upcoming' );
		} finally {
			delete_transient( $lock );
		}
	}

	/** Refresh completed matches when the previous-match cache is missing or stale. */
	public function poll_previous_if_stale(): array {
		$cached  = $this->cached_matches( 'previous' );
		$enabled = (bool) get_option( "instascore_provider_{$this->sport}_polling_enabled", false );
		if ( ! $this->configured || ! $enabled ) return $cached;
		$updated = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		if ( false !== $updated && $updated > time() - ( 12 * HOUR_IN_SECONDS ) ) return $cached;
		$lock = "instascore_{$this->sport}_previous_poll_lock";
		if ( false !== get_transient( $lock ) ) return $cached;
		set_transient( $lock, '1', 90 );
		try {
			$this->sync( 'previous', array( 'source' => 'stale_public_previous_poll', 'last' => 50 ), false );
			return $this->cached_matches( 'previous' );
		} finally {
			delete_transient( $lock );
		}
	}

	/**
	 * @return array<string,mixed>|null
	 */
	public function cached_match( string $provider_id ): ?array {
		foreach ( array( 'live', 'upcoming', 'previous', 'fixtures' ) as $period ) {
			$snapshot = $this->repository->latest_preview( $this->provider_name, $period );
			foreach ( $snapshot['items'] as $item ) {
				if ( $provider_id === (string) ( $item['providerId'] ?? '' ) ) {
					return $item;
				}
			}
		}
		return null;
	}

	/**
	 * Build and cache the full API-Football match centre payload.
	 *
	 * @return array<string,mixed>|null
	 */
	public function football_match_details( string $provider_id ): ?array {
		$match = $this->cached_match( $provider_id );
		if ( null === $match || ! $this->provider instanceof FootballProviderAdapter ) {
			return null;
		}

		$key      = 'match_details_' . $provider_id;
		$cached   = $this->repository->latest_preview( $this->provider_name, $key );
		$updated  = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		$lifetime = 'live' === ( $match['status'] ?? '' ) ? 30 : 3600;
		if ( ! empty( $cached['items']['match'] ) && false !== $updated && $updated > time() - $lifetime ) {
			return $cached['items'];
		}

		$lock = 'instascore_football_match_details_' . $provider_id;
		if ( false !== get_transient( $lock ) && ! empty( $cached['items']['match'] ) ) {
			return $cached['items'];
		}
		set_transient( $lock, '1', 30 );
		try {
			$events_raw  = $this->safe_provider_call( fn(): array => $this->provider->getFixtureEvents( $provider_id ) );
			$lineups_raw = $this->safe_provider_call( fn(): array => $this->provider->getFixtureLineups( $provider_id ) );
			$stats_raw   = $this->safe_provider_call( fn(): array => $this->provider->getFixtureStatistics( $provider_id ) );
			$standings   = array();
			if ( ! empty( $match['competitionProviderId'] ) && ! empty( $match['seasonProviderId'] ) ) {
				$standings_raw = $this->safe_provider_call( fn(): array => $this->provider->getStandings( (string) $match['competitionProviderId'], (string) $match['seasonProviderId'] ) );
				$standings = $this->normalizer->standings( $standings_raw );
			}

			$details = array(
				'match'      => $match,
				'events'     => $this->normalise_match_events( $events_raw ),
				'lineups'    => $this->normalise_match_lineups( $lineups_raw ),
				'statistics' => $this->normalise_match_statistics( $stats_raw ),
				'standings'  => $standings,
				'updatedAt'  => gmdate( DATE_ATOM ),
			);
			$this->repository->store_snapshot( $this->provider_name, $this->sport, $key, $details );
			return $details;
		} finally {
			delete_transient( $lock );
		}
	}

	/** @return array<string,mixed> */
	private function safe_provider_call( callable $callback ): array {
		try {
			$result = $callback();
			return is_array( $result ) ? $result : array();
		} catch ( Throwable ) {
			return array();
		}
	}

	/** @return array<int,array<string,mixed>> */
	private function normalise_match_events( array $payload ): array {
		$rows = is_array( $payload['response'] ?? null ) ? $payload['response'] : array();
		return array_map( static fn( array $row ): array => array(
			'elapsed'    => (int) ( $row['time']['elapsed'] ?? 0 ),
			'extra'      => (int) ( $row['time']['extra'] ?? 0 ),
			'teamId'     => (string) ( $row['team']['id'] ?? '' ),
			'teamName'   => (string) ( $row['team']['name'] ?? '' ),
			'teamLogoUrl'=> (string) ( $row['team']['logo'] ?? '' ),
			'playerName' => (string) ( $row['player']['name'] ?? '' ),
			'assistName' => (string) ( $row['assist']['name'] ?? '' ),
			'type'       => (string) ( $row['type'] ?? '' ),
			'detail'     => (string) ( $row['detail'] ?? '' ),
			'comments'   => (string) ( $row['comments'] ?? '' ),
		), array_values( array_filter( $rows, 'is_array' ) ) );
	}

	/** @return array<int,array<string,mixed>> */
	private function normalise_match_lineups( array $payload ): array {
		$rows = is_array( $payload['response'] ?? null ) ? $payload['response'] : array();
		return array_map( static fn( array $row ): array => array(
			'teamId'       => (string) ( $row['team']['id'] ?? '' ),
			'teamName'     => (string) ( $row['team']['name'] ?? '' ),
			'teamLogoUrl'  => (string) ( $row['team']['logo'] ?? '' ),
			'formation'    => (string) ( $row['formation'] ?? '' ),
			'coachName'    => (string) ( $row['coach']['name'] ?? '' ),
			'coachPhotoUrl'=> (string) ( $row['coach']['photo'] ?? '' ),
			'startXI'      => array_values( array_map( static fn( array $item ): array => array(
				'id' => (string) ( $item['player']['id'] ?? '' ), 'name' => (string) ( $item['player']['name'] ?? '' ),
				'number' => (int) ( $item['player']['number'] ?? 0 ), 'position' => (string) ( $item['player']['pos'] ?? '' ),
			), array_filter( (array) ( $row['startXI'] ?? array() ), 'is_array' ) ) ),
			'substitutes'  => array_values( array_map( static fn( array $item ): array => array(
				'id' => (string) ( $item['player']['id'] ?? '' ), 'name' => (string) ( $item['player']['name'] ?? '' ),
				'number' => (int) ( $item['player']['number'] ?? 0 ), 'position' => (string) ( $item['player']['pos'] ?? '' ),
			), array_filter( (array) ( $row['substitutes'] ?? array() ), 'is_array' ) ) ),
		), array_values( array_filter( $rows, 'is_array' ) ) );
	}

	/** @return array<int,array<string,mixed>> */
	private function normalise_match_statistics( array $payload ): array {
		$rows = is_array( $payload['response'] ?? null ) ? $payload['response'] : array();
		return array_map( static fn( array $row ): array => array(
			'teamId'      => (string) ( $row['team']['id'] ?? '' ),
			'teamName'    => (string) ( $row['team']['name'] ?? '' ),
			'teamLogoUrl' => (string) ( $row['team']['logo'] ?? '' ),
			'items'       => array_values( array_map( static fn( array $item ): array => array(
				'label' => (string) ( $item['type'] ?? '' ), 'value' => $item['value'] ?? null,
			), array_filter( (array) ( $row['statistics'] ?? array() ), 'is_array' ) ) ),
		), array_values( array_filter( $rows, 'is_array' ) ) );
	}
}
