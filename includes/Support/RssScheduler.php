<?php
/** RSS import schedule. @package InstaScore_Platform */
namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\RssImportService;

final class RssScheduler {
	public const HOOK = 'instascore_rss_import';
	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) );
		add_action( self::HOOK, array( RssImportService::class, 'run' ) );
		self::reschedule();
	}
	public static function schedules( array $schedules ): array {
		$schedules['every_15_minutes'] = array( 'interval' => 15 * MINUTE_IN_SECONDS, 'display' => 'Every 15 minutes' );
		return $schedules;
	}
	public static function reschedule(): void {
		$interval = RssImportService::settings()['interval'];
		$event = wp_get_scheduled_event( self::HOOK );
		if ( false !== $event && $event->schedule === $interval ) return;
		wp_clear_scheduled_hook( self::HOOK );
		wp_schedule_event( time() + MINUTE_IN_SECONDS, $interval, self::HOOK );
	}
}
