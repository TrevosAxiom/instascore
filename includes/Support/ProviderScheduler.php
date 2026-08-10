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

	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) );
		add_action( self::HOOK, array( self::class, 'run' ), 10, 1 );
		add_action( self::BASKETBALL_HOOK, array( self::class, 'run_basketball' ), 10, 1 );
		self::ensure_upcoming_event( self::HOOK );
		self::ensure_upcoming_event( self::BASKETBALL_HOOK );
		self::ensure_live_event( 'football', self::HOOK, 'instascore_football_provider_live' );
		self::ensure_live_event( 'basketball', self::BASKETBALL_HOOK, 'instascore_basketball_provider_live' );
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
		$football   = (int) get_option( 'instascore_provider_football_live_interval_seconds', 60 );
		$basketball = (int) get_option( 'instascore_provider_basketball_live_interval_seconds', 60 );
		$schedules['instascore_football_provider_live'] = array(
			'interval' => max( 15, min( 3600, $football ) ),
			'display'  => 'InstaScore football provider live polling',
		);
		$schedules['instascore_basketball_provider_live'] = array(
			'interval' => max( 15, min( 3600, $basketball ) ),
			'display'  => 'InstaScore basketball provider live polling',
		);
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

	public static function run( string $cadence = 'future' ): void {
		$sync_type = match ( $cadence ) {
			'live'      => 'live',
			'upcoming'  => 'upcoming',
			'nearStart' => 'fixtures',
			'completed' => 'fixtures',
			default     => 'fixtures',
		};
		ProviderSyncService::create_for_sport( 'football' )->sync( $sync_type, self::filters( $cadence ), false );
		if ( 'upcoming' === $cadence ) ProviderSyncService::create_for_sport( 'football' )->sync( 'previous', array( 'last' => 50, 'source' => 'scheduled_previous_poll' ), false );
	}

	public static function run_basketball( string $cadence = 'future' ): void {
		$sync_type = match ( $cadence ) {
			'live'      => 'live',
			'upcoming'  => 'upcoming',
			'nearStart' => 'fixtures',
			'completed' => 'fixtures',
			default     => 'fixtures',
		};
		ProviderSyncService::create_for_sport( 'basketball' )->sync( $sync_type, self::filters( $cadence ), false );
		if ( 'upcoming' === $cadence ) ProviderSyncService::create_for_sport( 'basketball' )->sync( 'previous', array( 'last' => 50, 'source' => 'scheduled_previous_poll' ), false );
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
