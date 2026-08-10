<?php

use InstaScore\Platform\Support\RssProvisioner;
use PHPUnit\Framework\TestCase;

final class RssProvisionerTest extends TestCase {
	public function test_default_sources_cover_each_news_category(): void {
		$defaults   = RssProvisioner::defaults();
		$categories = array_column( $defaults, 'category' );

		$this->assertContains( 'cffl', $categories );
		$this->assertContains( 'flag-football', $categories );
		$this->assertContains( 'football', $categories );
		$this->assertContains( 'basketball', $categories );
	}

	public function test_unverified_cffl_feed_is_seeded_inactive(): void {
		$cffl = array_values( array_filter( RssProvisioner::defaults(), static fn( array $source ): bool => 'cffl' === $source['category'] ) )[0];

		$this->assertSame( 'inactive', $cffl['status'] );
	}
}
