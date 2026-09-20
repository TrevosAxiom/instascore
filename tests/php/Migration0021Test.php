<?php
/** Team ecosystem migration tests. @package InstaScore_Platform */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Database\Version0021;
use PHPUnit\Framework\TestCase;
use wpdb;

final class Migration0021Test extends TestCase {
	public function test_roster_workflow_schema_supports_approval_and_transfer_history(): void {
		$migration = new Version0021( new wpdb() );
		$sql = $migration->schema();
		self::assertSame( 21, $migration->version() );
		self::assertStringContainsString( 'instascore_roster_requests', $sql );
		self::assertStringContainsString( 'target_team_id', $sql );
		self::assertStringContainsString( 'reviewed_by', $sql );
		self::assertStringContainsString( 'player_season', $sql );
	}
}
