<?php
/** Daily database maintenance scheduling. @package InstaScore_Platform */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\DatabaseMaintenanceService;

final class DatabaseMaintenanceScheduler {
	public const HOOK = 'instascore_database_maintenance';
	public static function register(): void {
		add_action( self::HOOK, array( self::class, 'run' ) );
		if ( false === wp_get_scheduled_event( self::HOOK ) ) wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::HOOK );
	}
	public static function run(): void {
		$service = DatabaseMaintenanceService::create();
		$service->cleanup_retention();
		$service->integrity_report();
	}
}
