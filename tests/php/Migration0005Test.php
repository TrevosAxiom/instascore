<?php

use InstaScore\Platform\Database\Version0005;
use PHPUnit\Framework\TestCase;

final class Migration0005Test extends TestCase {
	public function test_scoring_migration_declares_append_only_event_tables(): void {
		$schema = implode( "\n", ( new Version0005( new wpdb() ) )->schemas() );

		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_match_events', $schema );
		$this->assertStringContainsString( 'client_event_id varchar(191) NOT NULL', $schema );
		$this->assertStringContainsString( 'UNIQUE KEY fixture_client_event', $schema );
		$this->assertStringContainsString( 'sequence_number bigint(20) unsigned NOT NULL', $schema );
		$this->assertStringContainsString( 'voided_at datetime NULL', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_match_clock_states', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_scorekeeper_assignments', $schema );
	}
}
