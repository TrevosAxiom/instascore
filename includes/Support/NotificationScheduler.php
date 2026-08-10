<?php
/**
 * Notification queue and reminder scheduling.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Notifications\NotificationDispatcher;

final class NotificationScheduler {
	public const WORKER_HOOK = 'instascore_notification_worker';
	public const REMINDER_HOOK = 'instascore_notification_reminders';

	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) );
		add_action( self::WORKER_HOOK, array( self::class, 'process' ) );
		add_action( self::REMINDER_HOOK, array( self::class, 'reminders' ) );
		self::ensure( self::WORKER_HOOK, 'instascore_every_minute', MINUTE_IN_SECONDS );
		self::ensure( self::REMINDER_HOOK, 'instascore_every_five_minutes', 2 * MINUTE_IN_SECONDS );
	}

	/** @param array<string,array<string,mixed>> $schedules */
	public static function schedules( array $schedules ): array {
		$schedules['instascore_every_minute'] = array( 'interval' => MINUTE_IN_SECONDS, 'display' => 'Every minute (InstaScore)' );
		$schedules['instascore_every_five_minutes'] = array( 'interval' => 5 * MINUTE_IN_SECONDS, 'display' => 'Every five minutes (InstaScore)' );
		return $schedules;
	}

	public static function process(): void {
		NotificationDispatcher::create()->process_due();
	}

	public static function reminders(): void {
		NotificationDispatcher::create()->queue_starting_reminders();
	}

	private static function ensure( string $hook, string $schedule, int $delay ): void {
		$event = wp_get_scheduled_event( $hook );
		if ( false !== $event && $schedule === $event->schedule ) {
			return;
		}
		if ( false !== $event ) {
			wp_clear_scheduled_hook( $hook );
		}
		wp_schedule_event( time() + $delay, $schedule, $hook );
	}
}
