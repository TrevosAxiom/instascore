<?php
/** Engagement discovery safeguards. @package InstaScore_Platform */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Repositories\FavouriteRepository;
use PHPUnit\Framework\TestCase;
use wpdb;

final class EngagementRepositoryTest extends TestCase {
	public function test_search_requires_a_meaningful_term(): void {
		$repository = new FavouriteRepository( new wpdb() );
		self::assertSame( array(), $repository->search( '' ) );
		self::assertSame( array(), $repository->search( 'a' ) );
	}

	public function test_empty_favourites_produce_no_fixture_feed(): void {
		$repository = new FavouriteRepository( new wpdb() );
		self::assertSame( array(), $repository->fixture_feed( array() ) );
	}
}
