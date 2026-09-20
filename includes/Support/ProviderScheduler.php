<?php
/**
 * Provider sync scheduler hooks.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\ProviderSyncService;

final class ProviderScheduler {
	public const HOOK = 'instascore_football_provider_sync';
	public const BASKETBALL_HOOK = 'instascore_basketball_provider_sync';
	public const NFL_HOOK = 'instascore_nfl_provider_sync';

	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) );
		add_action( self::HOOK, array( self::class, 'run' ), 10, 2 );
		add_action( self::BASKETBALL_HOOK, array( self::class, 'run_basketball' ), 10, 2 );
		add_action( self::NFL_HOOK, array( self::class, 'run_nfl' ), 10, 2 );
		self::ensure_upcoming_event( self::HOOK );
		self::ensure_upcoming_event( self::BASKETBALL_HOOK );
		self::ensure_upcoming_event( self::NFL_HOOK );
		self::ensure_live_event( 'football', self::HOOK, 'instascore_football_provider_live' );
		self::ensure_live_event( 'basketball', self::BASKETBALL_HOOK, 'instascore_basketball_provider_live' );
		self::ensure_live_event( 'nfl', self::NFL_HOOK, 'instascore_nfl_provider_live' );
	}

	/** Reconcile live events immediately after an administrator saves settings. */
	public static function reconcile_live_events(): void {
		self::ensure_live_event( 'football', self::HOOK, 'instascore_football_provider_live' );
		self::ensure_live_event( 'basketball', self::BASKETBALL_HOOK, 'instascore_basketball_provider_live' );
		self::ensure_live_event( 'nfl', self::NFL_HOOK, 'instascore_nfl_provider_live' );
	}

	private static function ensure_upcoming_event( string $hook ): void {
		wp_clear_scheduled_hook( $hook, array( 'future' ) );
		$event = wp_get_scheduled_event( $hook, array( 'upcoming' ) );
		if ( false !== $event && 'twicedaily' === $event->schedule ) {
			return;
		}
		if ( false !== $event ) {
			wp_clear_scheduled_hook( $hook, array( 'upcoming' ) );
		}
		wp_schedule_event( time() + MINUTE_IN_SECONDS, 'twicedaily', $hook, array( 'upcoming' ) );
	}

	public static function schedules( array $schedules ): array {
		$football   = (int) get_option( 'instascore_provider_football_live_interval_seconds', 30 );
		$basketball = (int) get_option( 'instascore_provider_basketball_live_interval_seconds', 30 );
		$nfl        = (int) get_option( 'instascore_provider_nfl_live_interval_seconds', 30 );
		$schedules['instascore_football_provider_live'] = array(
			'interval' => max( 15, min( 3600, $football ) ),
			'display'  => 'InstaScore football provider live polling',
		);
		$schedules['instascore_basketball_provider_live'] = array(
			'interval' => max( 15, min( 3600, $basketball ) ),
			'display'  => 'InstaScore basketball provider live polling',
		);
		$schedules['instascore_nfl_provider_live'] = array( 'interval' => max( 15, min( 3600, $nfl ) ), 'display' => 'InstaScore NFL provider live polling' );
		return $schedules;
	}

	private static function ensure_live_event( string $sport, string $hook, string $schedule ): void {
		$enabled = (bool) get_option( "instascore_provider_{$sport}_polling_enabled", false );
		$event   = wp_get_scheduled_event( $hook, array( 'live' ) );
		if ( ! $enabled ) {
			if ( false !== $event ) {
				wp_clear_scheduled_hook( $hook, array( 'live' ) );
			}
			return;
		}
		if ( false !== $event && $schedule === $event->schedule ) {
			return;
		}
		if ( false !== $event ) {
			wp_clear_scheduled_hook( $hook, array( 'live' ) );
		}
		wp_schedule_event( time() + MINUTE_IN_SECONDS, $schedule, $hook, array( 'live' ) );
	}

	public static function run( string $cadence = 'future', int $attempt = 1 ): void {
		self::execute( 'football', self::HOOK, $cadence, $attempt );
	}

	public static function run_basketball( string $cadence = 'future', int $attempt = 1 ): void {
		self::execute( 'basketball', self::BASKETBALL_HOOK, $cadence, $attempt );
	}

	public static function run_nfl( string $cadence = 'future', int $attempt = 1 ): void {
		self::execute( 'nfl', self::NFL_HOOK, $cadence, $attempt );
	}

	private static function execute( string $sport, string $hook, string $cadence, int $attempt ): void {
		if ( ! (bool) get_option( "instascore_provider_{$sport}_polling_enabled", false ) ) return;
		$attempt = max( 1, min( 3, $attempt ) );
		$token = ProviderPollLock::acquire( $sport, $cadence, 'live' === $cadence ? 90 : 300 );
		if ( null === $token ) return;
		try {
			$sync_type = match ( $cadence ) {
				'live' => 'live',
				'upcoming' => 'upcoming',
				'nearStart', 'completed' => 'fixtures',
				default => 'fixtures',
			};
			$filters = self::filters( $cadence );
			$filters['source'] = $attempt > 1 ? 'scheduled_retry' : 'scheduled_poll';
			$filters['attempt'] = $attempt;
			$result = ProviderSyncService::create_for_sport( $sport )->sync( $sync_type, $filters, false );
			if ( 'upcoming' === $cadence && 'succeeded' === ( $result['status'] ?? '' ) ) {
				ProviderSyncService::create_for_sport( $sport )->sync( 'previous', array( 'last' => 50, 'source' => 'scheduled_previous_poll', 'attempt' => $attempt ), false );
			}
			if ( in_array( (string) ( $result['status'] ?? '' ), array( 'failed', 'rate_limited' ), true ) && $attempt < 3 ) {
				$delay = 'rate_limited' === ( $result['status'] ?? '' ) ? max( 300, (int) ( $result['retryAfter'] ?? 300 ) ) : 60 * ( 5 ** ( $attempt - 1 ) );
				wp_schedule_single_event( time() + min( DAY_IN_SECONDS, $delay ), $hook, array( $cadence, $attempt + 1 ) );
			}
		} finally {
			ProviderPollLock::release( $sport, $cadence, $token );
		}
	}

	/** @return array<string,string> */
	private static function filters( string $cadence ): array {
		$filters = array( 'cadence' => $cadence );
		if ( 'upcoming' === $cadence ) {
			$filters['from'] = wp_date( 'Y-m-d' );
			$filters['to']   = wp_date( 'Y-m-d', time() + ( 30 * DAY_IN_SECONDS ) );
		}
		return $filters;
	}
}
