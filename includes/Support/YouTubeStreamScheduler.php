<?php
/** YouTube broadcast synchronization schedule. @package InstaScore_Platform */
namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\YouTubeLiveService;

final class YouTubeStreamScheduler {
	public const HOOK = 'instascore_youtube_stream_sync';
	public static function register(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) );
		add_action( self::HOOK, array( self::class, 'run' ) );
		if ( false === wp_get_scheduled_event( self::HOOK ) ) { wp_schedule_event( time() + MINUTE_IN_SECONDS, 'instascore_every_minute', self::HOOK ); }
	}
	public static function schedules( array $schedules ): array {
		$schedules['instascore_every_minute'] = array( 'interval' => MINUTE_IN_SECONDS, 'display' => 'Every minute' );
		return $schedules;
	}
	public static function run(): void {
		try { if ( YouTubeLiveService::create()->settings()['connected'] ) { YouTubeLiveService::create()->synchronize(); } }
		catch ( \Throwable $error ) { do_action( 'instascore_log_error', $error ); }
	}
}
