<?php
/** Database maintenance tests. @package InstaScore_Platform */

use InstaScore\Platform\Repositories\OperationsRepository;
use InstaScore\Platform\Services\DatabaseMaintenanceService;
use PHPUnit\Framework\TestCase;

final class DatabaseMaintenanceTest extends TestCase {
	public function test_integrity_report_contains_bounded_checks(): void {
		$database = new class() extends wpdb {
			public array $checked = array();
			public function get_var( string $sql ): int { $this->checked[] = $sql; return 0; }
		};
		$service = new DatabaseMaintenanceService( $database, new OperationsRepository( $database ) );
		$report = $service->integrity_report();
		$this->assertSame( 'healthy', $report['status'] );
		$this->assertCount( 5, $report['checks'] );
		$this->assertCount( 5, $database->checked );
	}

	public function test_retention_cleanup_only_targets_operational_tables(): void {
		$database = new class() extends wpdb {
			public array $queries = array();
			public function query( string $sql ): int { $this->queries[] = $sql; return 1; }
		};
		$service = new DatabaseMaintenanceService( $database, new OperationsRepository( $database ) );
		$result = $service->cleanup_retention();
		$this->assertSame( 7, $result['deletedTotal'] );
		$this->assertCount( 7, $database->queries );
		$this->assertStringNotContainsString( 'instascore_fixtures', implode( ' ', $database->queries ) );
		$this->assertStringNotContainsString( 'instascore_players', implode( ' ', $database->queries ) );
	}
}
