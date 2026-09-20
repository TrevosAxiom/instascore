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
use InstaScore\Platform\Providers\NflNormalizer;
use InstaScore\Platform\Providers\NflProviderAdapter;
use InstaScore\Platform\Providers\SportsProviderInterface;
use InstaScore\Platform\Repositories\ProviderRepository;
use InstaScore\Platform\Support\Config;
use Throwable;

final class ProviderSyncService {
	public function __construct(
		private readonly ProviderRepository $repository,
		private readonly SportsProviderInterface $provider,
		private readonly FootballNormalizer|BasketballNormalizer|NflNormalizer $normalizer,
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
		if ( 'nfl' === $sport ) {
			return new self( new ProviderRepository( $wpdb ), new NflProviderAdapter(), new NflNormalizer(), 'nfl', Config::nfl_provider_name(), Config::nfl_provider_base_url(), '' !== Config::nfl_provider_api_key() );
		}
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
		$league_ids = $this->league_ids();
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
			$persisted_matches = 0;
			if ( ! $dry_run ) {
				$this->repository->store_snapshot( $this->provider_name, $this->sport, $sync_type, $payload );
				if ( in_array( $sync_type, array( 'fixtures', 'upcoming', 'previous', 'live' ), true ) ) {
					$persisted_matches = $this->repository->upsert_matches( $this->provider_name, $this->sport, $payload );
				}
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

			return array( 'status' => 'succeeded', 'dryRun' => $dry_run, 'count' => count( $payload ), 'persistedMatches' => $persisted_matches, 'preview' => array_slice( $payload, 0, 20 ), 'mappings' => $mappings, 'log' => $log );
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
			'leagueIds'       => $this->league_ids(),
			'schedules'       => array(
				'live'      => 'every_30_seconds_for_live_fixtures',
				'nearStart' => 'every_5_minutes_within_2_hours',
				'upcoming'  => 'every_12_hours_for_next_30_days',
				'completed' => 'twice_daily_until_confirmed',
			),
			'scheduleHealth'  => $this->schedule_health(),
			'dataQuality'     => $this->data_quality(),
			'conflicts'       => $this->repository->conflicts( $this->sport ),
			'recentSyncLogs'  => $this->repository->recent_logs( $this->provider_name ),
		);
	}

	/** Report whether polling is scheduled and whether its database snapshots are usable. */
	private function schedule_health(): array {
		$hook = match ( $this->sport ) {
			'basketball' => 'instascore_basketball_provider_sync',
			'nfl'        => 'instascore_nfl_provider_sync',
			default      => 'instascore_football_provider_sync',
		};
		$enabled = (bool) get_option( "instascore_provider_{$this->sport}_polling_enabled", false );
		$next_live = $this->next_scheduled_at( $hook, 'live' );
		$next_upcoming = $this->next_scheduled_at( $hook, 'upcoming' );
		$issues = array();
		if ( $enabled && null === $next_live ) {
			$issues[] = 'Live polling is enabled but its cron event is not scheduled.';
		}
		if ( $enabled && null === $next_upcoming ) {
			$issues[] = 'Fixture polling is enabled but its twice-daily cron event is not scheduled.';
		}

		return array(
			'status'         => ! $this->configured ? 'not_configured' : ( ! $enabled ? 'disabled' : ( array() === $issues ? 'healthy' : 'attention' ) ),
			'pollingEnabled' => $enabled,
			'wpCronDisabled' => defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON,
			'nextLiveAt'     => $next_live,
			'nextUpcomingAt' => $next_upcoming,
			'issues'         => $issues,
		);
	}

	private function next_scheduled_at( string $hook, string $cadence ): ?string {
		if ( ! function_exists( 'wp_next_scheduled' ) ) {
			return null;
		}
		$timestamp = wp_next_scheduled( $hook, array( $cadence ) );
		return false === $timestamp ? null : gmdate( DATE_ATOM, $timestamp );
	}

	/** Summarize incomplete, duplicate and unrecognized match data in persistent snapshots. */
	private function data_quality(): array {
		$thresholds = array( 'live' => 15 * MINUTE_IN_SECONDS, 'upcoming' => 13 * HOUR_IN_SECONDS, 'previous' => 13 * HOUR_IN_SECONDS );
		$monitor_staleness = $this->configured && (bool) get_option( "instascore_provider_{$this->sport}_polling_enabled", false );
		$snapshots = array();
		$seen = array();
		$duplicates = 0;
		$incomplete = 0;
		$unknown = array();
		$canonical = $this->repository->canonical_match_stats( $this->provider_name, $this->sport );

		foreach ( $thresholds as $period => $threshold ) {
			$snapshot = $this->repository->latest_preview( $this->provider_name, $period );
			$updated = null === $snapshot['lastKnownAt'] ? false : strtotime( (string) $snapshot['lastKnownAt'] . ' UTC' );
			$age = false === $updated ? null : max( 0, time() - $updated );
			$snapshots[ $period ] = array(
				'itemCount'   => count( $snapshot['items'] ),
				'lastKnownAt' => $snapshot['lastKnownAt'],
				'ageSeconds'  => $age,
				'stale'       => null === $age || $age > $threshold,
			);
			foreach ( $snapshot['items'] as $match ) {
				$id = (string) ( $match['providerId'] ?? '' );
				if ( '' !== $id && isset( $seen[ $id ] ) ) {
					++$duplicates;
				} elseif ( '' !== $id ) {
					$seen[ $id ] = true;
				}
				if ( '' === $id || '' === (string) ( $match['competitionProviderId'] ?? '' ) || '' === (string) ( $match['homeTeamProviderId'] ?? '' ) || '' === (string) ( $match['awayTeamProviderId'] ?? '' ) || false === strtotime( (string) ( $match['kickoffAt'] ?? '' ) ) ) {
					++$incomplete;
				}
				if ( false === ( $match['statusRecognized'] ?? true ) ) {
					$unknown[] = (string) ( $match['statusShort'] ?? '' );
				}
			}
		}

		$issues = array();
		if ( $monitor_staleness ) {
			foreach ( $snapshots as $period => $snapshot ) {
				if ( $snapshot['stale'] ) {
					$issues[] = ucfirst( $period ) . ' match data is stale or has never been cached.';
				}
			}
		}
		if ( $incomplete > 0 ) {
			$issues[] = "{$incomplete} cached matches have incomplete identity or kickoff data.";
		}
		if ( $duplicates > 0 ) {
			$issues[] = "{$duplicates} provider match IDs occur in more than one active snapshot.";
		}
		$unknown = array_values( array_unique( array_filter( $unknown ) ) );
		if ( array() !== $unknown ) {
			$issues[] = 'Unrecognized provider statuses: ' . implode( ', ', $unknown ) . '.';
		}

		return array(
			'status'              => array() === $issues ? 'healthy' : 'attention',
			'snapshots'           => $snapshots,
			'incompleteMatches'   => $incomplete,
			'duplicateProviderIds' => $duplicates,
			'unknownStatuses'     => $unknown,
			'canonicalMatches'    => $canonical,
			'issues'              => $issues,
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
			return $this->discard_expired_live_snapshot( $cached );
		}

		$interval = max( 15, min( 3600, (int) get_option( "instascore_provider_{$this->sport}_live_interval_seconds", 30 ) ) );
		$updated  = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		if ( false !== $updated && $updated > time() - $interval ) {
			return $cached;
		}

		$lock = "instascore_{$this->sport}_live_poll_lock";
		if ( false !== get_transient( $lock ) ) {
			return $this->discard_expired_live_snapshot( $cached, $interval );
		}
		set_transient( $lock, '1', max( 15, min( 60, $interval ) ) );
		try {
			$result = $this->sync( 'live', array( 'source' => 'stale_public_poll' ), false );
			if ( 'succeeded' === ( $result['status'] ?? '' ) ) {
				return $this->cached_live();
			}
			return $this->discard_expired_live_snapshot( $cached, $interval );
		} finally {
			delete_transient( $lock );
		}
	}

	/** Never present an hours- or months-old snapshot as a match that is still live. */
	private function discard_expired_live_snapshot( array $cached, int $interval = 60 ): array {
		$updated = null === ( $cached['lastKnownAt'] ?? null ) ? false : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		$grace = max( 300, min( 900, $interval * 3 ) );
		if ( false === $updated || $updated <= time() - $grace ) {
			return array( 'items' => array(), 'lastKnownAt' => $cached['lastKnownAt'] ?? null );
		}
		return $cached;
	}

	/**
	 * @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null}
	 */
	public function cached_matches( string $period ): array {
		$period = in_array( $period, array( 'live', 'upcoming', 'previous' ), true ) ? $period : 'live';
		$cached = $this->repository->canonical_matches( $this->provider_name, $this->sport, $period );
		if ( empty( $cached['items'] ) ) {
			$cached = $this->repository->latest_preview( $this->provider_name, $period );
		}
		$now = time();
		$cached['items'] = array_values( array_filter( $cached['items'], static function ( array $item ) use ( $period, $now ): bool {
			$kickoff = strtotime( (string) ( $item['kickoffAt'] ?? '' ) );
			if ( false === $kickoff ) {
				return false;
			}
			if ( 'upcoming' === $period ) {
				return $kickoff >= $now - ( 3 * HOUR_IN_SECONDS ) && in_array( (string) ( $item['status'] ?? '' ), array( 'draft', 'scheduled', 'postponed' ), true );
			}
			if ( 'previous' === $period ) {
				return $kickoff <= $now && in_array( (string) ( $item['status'] ?? '' ), array( 'completed', 'confirmed', 'cancelled' ), true );
			}
			return in_array( (string) ( $item['status'] ?? '' ), array( 'live', 'halftime', 'interval', 'warmup' ), true ) && $kickoff >= $now - DAY_IN_SECONDS && $kickoff <= $now + DAY_IN_SECONDS;
		} ) );
		return $cached;
	}

	/** Public competition catalogue sourced from the persistent provider snapshot. */
	public function public_competitions(): array {
		$allowed = array_map( 'strval', $this->league_ids() );
		if ( array() === $allowed ) return array();
		$cached = $this->repository->latest_preview( $this->provider_name, 'competitions' );
		if ( empty( $cached['items'] ) && $this->configured ) {
			$result = $this->sync( 'competitions', array( 'source' => 'public_catalogue_cache_miss' ), false );
			if ( 'succeeded' === ( $result['status'] ?? '' ) ) $cached = $this->repository->latest_preview( $this->provider_name, 'competitions' );
		}
		return array_values( array_filter( $cached['items'], static fn( array $item ): bool => in_array( (string) ( $item['providerId'] ?? '' ), $allowed, true ) ) );
	}

	/** Database-first provider table with an allow-listed API fallback. */
	public function public_standings( string $competition_id, string $season = '' ): array {
		$allowed = array_map( 'strval', $this->league_ids() );
		if ( ! in_array( $competition_id, $allowed, true ) ) throw new \InvalidArgumentException( 'Competition is not enabled for public provider data.' );
		if ( '' === $season ) {
			foreach ( $this->public_competitions() as $competition ) {
				if ( $competition_id === (string) ( $competition['providerId'] ?? '' ) ) $season = (string) ( $competition['currentSeason'] ?? '' );
			}
		}
		$cache_key = sanitize_key( 'standings_' . $competition_id . '_' . $season );
		$cached = $this->repository->latest_preview( $this->provider_name, $cache_key );
		if ( ! empty( $cached['items'] ) || ! $this->configured || '' === $season ) return $cached['items'];
		$items = $this->normalizer->standings( $this->provider->getStandings( $competition_id, $season ) );
		$this->repository->store_snapshot( $this->provider_name, $this->sport, $cache_key, $items );
		return $items;
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

		$canonical = $this->repository->canonical_matches_for_date( $this->provider_name, $this->sport, $date );
		$canonical_items = $this->filter_period( $canonical['items'], $period );
		if ( ! empty( $canonical_items ) ) {
			return array( 'items' => $canonical_items, 'lastKnownAt' => $canonical['lastKnownAt'] );
		}

		$cache_key = 'matches_' . str_replace( '-', '_', $date );
		$cached = $this->repository->latest_preview( $this->provider_name, $cache_key );
		$updated = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		$empty_lifetime = 15 * MINUTE_IN_SECONDS;
		$is_today = $date === wp_date( 'Y-m-d', null, new \DateTimeZone( 'Africa/Lagos' ) );
		$live_interval = max( 15, min( 3600, (int) get_option( "instascore_provider_{$this->sport}_live_interval_seconds", 30 ) ) );
		$cache_lifetime = $is_today ? $live_interval : 12 * HOUR_IN_SECONDS;
		$is_fresh = false !== $updated && $updated > time() - $cache_lifetime;
		if ( null !== $cached['lastKnownAt'] && ( $is_fresh || ( empty( $cached['items'] ) && false !== $updated && $updated > time() - $empty_lifetime ) ) ) {
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
		if ( array() !== $broad_items && ! $is_today ) {
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
			$league_ids = $this->league_ids();
			$filters = $this->scope_to_configured_leagues(
				array( 'date' => $date, 'timezone' => 'Africa/Lagos', 'source' => 'public_date_cache_miss' ),
				$league_ids,
				'fixtures'
			);
			$items = $this->normalizer->fixtures( $this->provider->getFixtures( $filters ) );
			$items = array_values( array_filter( $items, static fn( array $item ): bool => $date === substr( (string) ( $item['kickoffAt'] ?? '' ), 0, 10 ) ) );
			$this->repository->store_snapshot( $this->provider_name, $this->sport, $cache_key, $items );
			$this->repository->upsert_matches( $this->provider_name, $this->sport, $items );
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
		return array_values( array_filter( $items, static function ( array $item ) use ( $statuses, $period ): bool {
			if ( ! in_array( (string) ( $item['status'] ?? '' ), $statuses, true ) ) return false;
			$kickoff = strtotime( (string) ( $item['kickoffAt'] ?? '' ) );
			return 'upcoming' !== $period || false === $kickoff || $kickoff > time();
		} ) );
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
		$provider_id = sanitize_text_field( $provider_id );
		if ( '' === $provider_id ) {
			return null;
		}
		$canonical_match = $this->repository->canonical_match( $this->provider_name, $this->sport, $provider_id );
		if ( null !== $canonical_match ) {
			return $canonical_match;
		}

		// A previously-built detail payload is the strongest local source for an old
		// match and must remain usable after the rolling "previous" list advances.
		$details = $this->repository->latest_preview( $this->provider_name, 'match_details_' . $provider_id );
		if ( is_array( $details['items']['match'] ?? null ) ) {
			return $details['items']['match'];
		}

		$lookup = $this->repository->latest_preview( $this->provider_name, 'match_lookup_' . $provider_id );
		foreach ( $lookup['items'] as $item ) {
			if ( $provider_id === (string) ( $item['providerId'] ?? '' ) ) {
				return $item;
			}
		}

		foreach ( array( 'live', 'upcoming', 'previous', 'fixtures' ) as $period ) {
			$snapshot = $this->repository->latest_preview( $this->provider_name, $period );
			foreach ( $snapshot['items'] as $item ) {
				if ( $provider_id === (string) ( $item['providerId'] ?? '' ) ) {
					return $item;
				}
			}
		}

		// Rolling snapshots intentionally contain only a bounded number of matches.
		// Resolve an older match by its provider ID, then persist it so subsequent
		// visitors remain database-first. Never expose a match outside the saved
		// competition allow-list.
		if ( ! $this->configured ) {
			return null;
		}
		$allowed_leagues = array_values( array_filter( array_map( 'strval', $this->league_ids() ) ) );
		if ( array() === $allowed_leagues ) {
			return null;
		}

		try {
			$filters = 'football' === $this->sport
				? array( 'fixtureId' => $provider_id )
				: array( 'id' => $provider_id );
			if ( 'nfl' === $this->sport ) {
				// The NFL adapter requires an explicit league scope for every request.
				$filters['leagueIds'] = $allowed_leagues;
			}
			$matches = $this->normalizer->fixtures( $this->provider->getFixtures( $filters ) );
			foreach ( $matches as $match ) {
				if (
					$provider_id === (string) ( $match['providerId'] ?? '' )
					&& in_array( (string) ( $match['competitionProviderId'] ?? '' ), $allowed_leagues, true )
				) {
					$this->repository->store_snapshot( $this->provider_name, $this->sport, 'match_lookup_' . $provider_id, array( $match ) );
					$this->repository->upsert_matches( $this->provider_name, $this->sport, array( $match ) );
					return $match;
				}
			}
		} catch ( Throwable $error ) {
			$this->repository->record_sync_log(
				array(
					'provider'     => $this->provider_name,
					'syncType'     => 'match_lookup_' . $provider_id,
					'status'       => 'failed',
					'filters'      => array( 'providerId' => $provider_id ),
					'errorCode'    => 'provider_match_lookup_failed',
					'errorMessage' => $error->getMessage(),
					'startedAt'    => gmdate( 'Y-m-d H:i:s' ),
				)
			);
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

	/** @return array<string,mixed>|null */
	public function provider_match_details( string $provider_id ): ?array {
		if ( 'football' === $this->sport ) return $this->football_match_details( $provider_id );
		$match = $this->cached_match( $provider_id );
		if ( null === $match ) return null;
		$key = 'match_details_' . $provider_id;
		$cached = $this->repository->latest_preview( $this->provider_name, $key );
		$updated = null === $cached['lastKnownAt'] ? 0 : strtotime( (string) $cached['lastKnownAt'] . ' UTC' );
		if ( ! empty( $cached['items']['match'] ) && false !== $updated && $updated > time() - 3600 ) return $cached['items'];
		$stats = $this->safe_provider_call( fn(): array => $this->provider->getStatistics( array( 'game' => $provider_id ) ) );
		$standings = array();
		if ( ! empty( $match['competitionProviderId'] ) && ! empty( $match['seasonProviderId'] ) ) {
			$standings = $this->normalizer->standings( $this->safe_provider_call( fn(): array => $this->provider->getStandings( (string) $match['competitionProviderId'], (string) $match['seasonProviderId'] ) ) );
		}
		$details = array( 'match' => $match, 'events' => array(), 'lineups' => array(), 'statistics' => $this->normalizer->statistics( $stats ), 'standings' => $standings, 'updatedAt' => gmdate( DATE_ATOM ) );
		$this->repository->store_snapshot( $this->provider_name, $this->sport, $key, $details );
		return $details;
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

	/** @return array<int,string> */
	private function league_ids(): array {
		return match ( $this->sport ) {
			'basketball' => Config::basketball_provider_league_ids(),
			'nfl'        => Config::nfl_provider_league_ids(),
			default      => Config::football_provider_league_ids(),
		};
	}
}
