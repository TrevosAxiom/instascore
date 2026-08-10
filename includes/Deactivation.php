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
		flush_rewrite_rules();
	}
}
