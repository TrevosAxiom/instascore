<?php
/** Canonical provider match storage schema tests. @package InstaScore_Platform */

use InstaScore\Platform\Database\Version0019;
use PHPUnit\Framework\TestCase;

final class Migration0019Test extends TestCase {
	public function test_provider_match_schema_is_permanent_and_uniquely_keyed(): void {
		$schema = ( new Version0019( new wpdb() ) )->schema();
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_provider_matches', $schema );
		$this->assertStringContainsString( 'UNIQUE KEY provider_sport_match (provider_name,sport_slug,provider_match_id)', $schema );
		$this->assertStringContainsString( 'KEY sport_kickoff (sport_slug,kickoff_at)', $schema );
		$this->assertStringContainsString( 'payload_json longtext NOT NULL', $schema );
	}
}
