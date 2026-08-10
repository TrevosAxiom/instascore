<?php
/**
 * Repository tests.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Repositories\BaseRepository;
use PHPUnit\Framework\TestCase;
use wpdb;

final class RepositoryTest extends TestCase {
	public function test_repository_creates_and_reads_by_public_uuid(): void {
		$database   = new wpdb();
		$repository = new BaseRepository( $database, 'sports' );
		$uuid       = '00000000-0000-4000-8000-000000000099';
		$created    = $repository->create(
			array(
				'uuid' => $uuid,
				'name' => 'Flag Football',
			)
		);
		self::assertSame( $uuid, $created['uuid'] );
		self::assertSame( 1, $repository->id_for_uuid( $uuid ) );
	}
}
