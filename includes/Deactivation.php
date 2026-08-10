<?php
/**
 * Plugin deactivation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform;

final class Deactivation {
	public static function deactivate(): void {
		wp_clear_scheduled_hook( 'instascore_run_background_jobs' );
		wp_clear_scheduled_hook( 'instascore_rss_import' );
		wp_clear_scheduled_hook( 'instascore_notification_worker' );
		wp_clear_scheduled_hook( 'instascore_notification_reminders' );
		flush_rewrite_rules();
	}
}
