<?php

use InstaScore\Platform\Database\Version0006;
use PHPUnit\Framework\TestCase;

final class Migration0006Test extends TestCase {
	public function test_standings_statistics_and_discipline_tables_are_declared(): void {
		$schema = implode( "\n", ( new Version0006( new wpdb() ) )->schemas() );

		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_standings', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_team_statistics', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_player_statistics', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_disciplinary_records', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_suspensions', $schema );
		$this->assertStringContainsString( 'rebuild_hash char(64) NOT NULL', $schema );
	}
}
