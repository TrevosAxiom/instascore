<?php

use InstaScore\Platform\Database\Version0004;
use PHPUnit\Framework\TestCase;

final class Migration0004Test extends TestCase {
	public function test_fixture_migration_declares_required_tables_and_indexes(): void {
		$migration = new Version0004( new wpdb() );
		$schema    = implode( "\n", $migration->schemas() );

		$this->assertSame( 4, $migration->version() );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_fixtures', $schema );
		$this->assertStringContainsString( 'uuid char(36) NOT NULL', $schema );
		$this->assertStringContainsString( 'kickoff_at datetime NOT NULL', $schema );
		$this->assertStringContainsString( 'fixture_status_history', $schema );
		$this->assertStringContainsString( 'fixture_officials', $schema );
		$this->assertStringContainsString( 'winner_next_fixture_id', $schema );
	}
}
