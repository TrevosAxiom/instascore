<?php

use InstaScore\Platform\Services\RssImportService;
use PHPUnit\Framework\TestCase;

final class RssCsvImportTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['instascore_test_options'][ RssImportService::SOURCES_OPTION ] = array();
	}

	public function test_imports_valid_rows_and_skips_duplicate_urls(): void {
		$file = tempnam( sys_get_temp_dir(), 'rss-csv-' );
		file_put_contents(
			$file,
			"site,rss_url,category,status\nESPN Soccer,https://example.com/soccer.xml,football,active\nESPN Duplicate,https://example.com/soccer.xml,football,active\nNCAA,https://example.com/basketball.xml,basketball,inactive\n"
		);

		$result = RssImportService::import_csv( $file );
		unlink( $file );

		$this->assertSame( 2, $result['imported'] );
		$this->assertSame( 1, $result['skipped'] );
		$this->assertSame( array(), $result['errors'] );
		$this->assertCount( 2, RssImportService::sources() );
	}

	public function test_rejects_csv_without_required_headers(): void {
		$file = tempnam( sys_get_temp_dir(), 'rss-csv-' );
		file_put_contents( $file, "name,address\nExample,https://example.com/feed\n" );

		$result = RssImportService::import_csv( $file );
		unlink( $file );

		$this->assertNotSame( '', $result['fatalError'] );
		$this->assertSame( 0, $result['imported'] );
	}
}
