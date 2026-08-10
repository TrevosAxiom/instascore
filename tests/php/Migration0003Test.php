<?php
/**
 * Migration 0003 tests.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Database\Version0003;
use PHPUnit\Framework\TestCase;
use wpdb;

final class Migration0003Test extends TestCase {
	public function test_migration_creates_team_player_tables_without_team_on_player(): void {
		$schemas = ( new Version0003( new wpdb() ) )->schemas();
		$sql     = implode( "\n", $schemas );

		self::assertStringContainsString( 'instascore_teams', $sql );
		self::assertStringContainsString( 'instascore_players', $sql );
		self::assertStringContainsString( 'instascore_team_registrations', $sql );
		self::assertStringContainsString( 'instascore_venues', $sql );
		self::assertStringContainsString( 'instascore_officials', $sql );
		self::assertStringNotContainsString( 'team_id bigint(20) unsigned NOT NULL,\\n\\t\\t\\t\\tfirst_name', $sql );
		self::assertStringContainsString( 'KEY active_jersey', $sql );
	}
}
