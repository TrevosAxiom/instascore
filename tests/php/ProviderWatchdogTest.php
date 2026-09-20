<?php
/** Provider watchdog tests. @package InstaScore_Platform */

use InstaScore\Platform\Repositories\OperationsRepository;
use InstaScore\Platform\Support\ProviderWatchdog;
use PHPUnit\Framework\TestCase;

final class ProviderWatchdogTest extends TestCase {
	public function test_watchdog_registers_a_five_minute_schedule(): void {
		$schedules = ProviderWatchdog::schedules( array() );
		$this->assertSame( 5 * MINUTE_IN_SECONDS, $schedules['instascore_provider_watchdog_interval']['interval'] );
	}

	public function test_operations_alert_is_persisted_and_can_be_resolved(): void {
		$database = new class() extends wpdb {
			public array $queries = array();
			public function query( string $sql ): int { $this->queries[] = $sql; return 1; }
		};
		$repository = new OperationsRepository( $database );
		$alert = $repository->open_alert( 'provider_watchdog_football', 'warning', 'Polling is stale.', array( 'failures' => 1 ) );
		$this->assertSame( 'open', $alert['status'] );
		$this->assertArrayHasKey( $alert['uuid'], $database->rows['wp_instascore_operations_alerts'] );
		$this->assertSame( 1, $repository->resolve_alert( 'provider_watchdog_football' ) );
		$this->assertStringContainsString( "status = 'resolved'", $database->queries[0] );
	}
}
