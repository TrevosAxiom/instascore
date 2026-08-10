<?php
/**
 * Idempotent default sports RSS source provisioning.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\RssImportService;

final class RssProvisioner {
	private const VERSION = '1';

	/** @return array<int,array<string,string>> */
	public static function defaults(): array {
		return array(
			array( 'site' => 'CFFL Africa', 'url' => 'https://www.cffl.africa/feed/', 'category' => 'cffl', 'status' => 'inactive' ),
			array( 'site' => 'Nigeria American Football Association', 'url' => 'https://nafa.ng/feed/', 'category' => 'flag-football', 'status' => 'active' ),
			array( 'site' => 'ESPN Soccer', 'url' => 'https://www.espn.com/espn/rss/soccer/news', 'category' => 'football', 'status' => 'active' ),
			array( 'site' => 'NCAA Basketball', 'url' => 'https://www.ncaa.com/news/basketball-men/d1/rss.xml', 'category' => 'basketball', 'status' => 'active' ),
		);
	}

	public static function maybe_seed(): void {
		if ( self::VERSION === get_option( 'instascore_rss_defaults_version', '' ) ) {
			return;
		}
		$existing = RssImportService::sources();
		$urls = array_map( static fn( array $source ): string => untrailingslashit( strtolower( (string) ( $source['url'] ?? '' ) ) ), $existing );
		foreach ( self::defaults() as $source ) {
			if ( in_array( untrailingslashit( strtolower( $source['url'] ) ), $urls, true ) ) {
				continue;
			}
			RssImportService::save_source( $source );
		}
		update_option( 'instascore_rss_defaults_version', self::VERSION, false );
	}
}
