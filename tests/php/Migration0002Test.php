<?php
/**
 * Schema migration tests.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Database\Version0002;
use PHPUnit\Framework\TestCase;
use wpdb;

final class Migration0002Test extends TestCase {
	public function test_creates_all_milestone_two_tables_and_shared_columns(): void {
		$schemas = ( new Version0002( new wpdb() ) )->schemas();
		$sql     = implode( "\n", $schemas );

		self::assertCount( 6, $schemas );
		foreach ( array( 'sports', 'competitions', 'seasons', 'stages', 'groups', 'audit_logs' ) as $table ) {
			self::assertStringContainsString( "wp_instascore_{$table}", $sql );
		}
		self::assertStringContainsString( 'uuid char(36) NOT NULL', $sql );
		self::assertStringContainsString( 'provider_object_id', $sql );
		self::assertStringContainsString( 'entity_history', $sql );
	}
}
