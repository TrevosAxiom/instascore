<?php
/** Provider cron watchdog, automatic repair and administrator alerts. @package InstaScore_Platform */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Repositories\OperationsRepository;
use InstaScore\Platform\Services\ProviderSyncService;

final class ProviderWatchdog {
	public const HOOK = 'instascore_provider_watchdog';
	private const SCHEDULE = 'instascore_provider_watchdog_interval';

	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) );
		add_action( self::HOOK, array( self::class, 'run' ) );
		if ( false === wp_get_scheduled_event( self::HOOK ) ) wp_schedule_event( time() + ( 2 * MINUTE_IN_SECONDS ), self::SCHEDULE, self::HOOK );
	}

	/** @param array<string,array<string,mixed>> $schedules */
	public static function schedules( array $schedules ): array {
		$schedules[ self::SCHEDULE ] = array( 'interval' => 5 * MINUTE_IN_SECONDS, 'display' => 'InstaScore provider watchdog' );
		return $schedules;
	}

	/** @return array<string,array<string,mixed>> */
	public static function run(): array {
		global $wpdb;
		$repository = new OperationsRepository( $wpdb );
		ProviderScheduler::reconcile_events();
		$report = array();
		foreach ( array( 'football', 'basketball', 'nfl' ) as $sport ) {
			if ( ! (bool) get_option( "instascore_provider_{$sport}_polling_enabled", false ) ) {
				self::recover( $repository, $sport, 'Polling is disabled.' );
				$report[ $sport ] = array( 'status' => 'disabled' );
				continue;
			}
			$health = ProviderSyncService::create_for_sport( $sport )->health();
			$schedule = (array) ( $health['scheduleHealth'] ?? array() );
			$quality = (array) ( $health['dataQuality'] ?? array() );
			$issues = array_values( array_unique( array_merge( (array) ( $schedule['issues'] ?? array() ), self::critical_data_issues( $quality ) ) ) );
			if ( array() === $issues ) {
				self::recover( $repository, $sport, 'Provider polling recovered.' );
				$report[ $sport ] = array( 'status' => 'healthy', 'repaired' => false );
				continue;
			}
			$source = "provider_watchdog_{$sport}";
			$count = (int) get_option( "instascore_{$source}_failures", 0 ) + 1;
			update_option( "instascore_{$source}_failures", $count, false );
			$message = ucfirst( $sport ) . ' provider polling needs attention: ' . implode( ' ', $issues );
			$recovery_queued = false;
			foreach ( $issues as $issue ) {
				$cadence = str_starts_with( strtolower( $issue ), 'live' ) ? 'live' : 'upcoming';
				$recovery_queued = ProviderScheduler::queue_recovery( $sport, $cadence ) || $recovery_queued;
			}
			$repository->open_alert( $source, $count >= 2 ? 'critical' : 'warning', $message, array( 'consecutiveFailures' => $count, 'issues' => $issues, 'checkedAt' => gmdate( DATE_ATOM ) ) );
			if ( 2 === $count ) self::notify_admin( $sport, $message, false );
			$report[ $sport ] = array( 'status' => 'attention', 'consecutiveFailures' => $count, 'issues' => $issues, 'recoveryQueued' => $recovery_queued );
		}
		update_option( 'instascore_provider_watchdog_last_run', array( 'checkedAt' => gmdate( DATE_ATOM ), 'report' => $report ), false );
		return $report;
	}

	/** @return array<int,string> */
	private static function critical_data_issues( array $quality ): array {
		$issues = array();
		foreach ( (array) ( $quality['snapshots'] ?? array() ) as $period => $snapshot ) {
			if ( ! empty( $snapshot['stale'] ) ) $issues[] = ucfirst( (string) $period ) . ' provider data is stale.';
		}
		return $issues;
	}

	private static function recover( OperationsRepository $repository, string $sport, string $message ): void {
		$source = "provider_watchdog_{$sport}";
		$failures = (int) get_option( "instascore_{$source}_failures", 0 );
		$resolved = $repository->resolve_alert( $source );
		delete_option( "instascore_{$source}_failures" );
		if ( $failures >= 2 && $resolved > 0 ) self::notify_admin( $sport, $message, true );
	}

	private static function notify_admin( string $sport, string $message, bool $recovered ): void {
		if ( (bool) get_option( 'instascore_admin_notification_disable', false ) ) return;
		$email = sanitize_email( (string) get_option( 'admin_email', '' ) );
		if ( '' === $email ) return;
		$subject = sprintf( '[InstaScore] %s provider polling %s', ucfirst( $sport ), $recovered ? 'recovered' : 'alert' );
		wp_mail( $email, $subject, $message . "\n\nReview the Operations Control Room for redacted diagnostics." );
	}
}
