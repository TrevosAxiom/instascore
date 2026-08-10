<?php
/**
 * Mutation service tests.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Services\CatalogService;
use PHPUnit\Framework\TestCase;
use wpdb;

final class ServiceTest extends TestCase {
	public function test_catalog_mutation_creates_an_audit_record(): void {
		$database = new wpdb();
		$created  = ( new CatalogService( $database ) )->create(
			'sports',
			array( 'name' => 'Flag Football' )
		);

		self::assertSame( 'Flag Football', $created['name'] );
		self::assertCount( 1, $database->rows['wp_instascore_audit_logs'] );
		$audit = array_values( $database->rows['wp_instascore_audit_logs'] )[0];
		self::assertSame( 'created', $audit['action'] );
		self::assertSame( $created['uuid'], $audit['entity_uuid'] );
	}
}
