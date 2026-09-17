<?php

use InstaScore\Platform\Database\Version0017;
use InstaScore\Platform\Repositories\StreamAnalyticsRepository;
use InstaScore\Platform\Services\StreamAnalyticsService;
use PHPUnit\Framework\TestCase;

final class StreamAnalyticsTest extends TestCase {
	public function test_schema_keeps_aggregate_sessions_and_sponsors_separate(): void {
		$schemas = ( new Version0017( new wpdb() ) )->schemas();
		$this->assertStringContainsString( 'stream_view_sessions', $schemas[0] );
		$this->assertStringContainsString( 'UNIQUE KEY stream_session (stream_id,session_hash)', $schemas[0] );
		$this->assertStringContainsString( 'stream_sponsors', $schemas[1] );
		$this->assertStringContainsString( 'impressions bigint', $schemas[1] );
	}

	public function test_view_session_stores_a_salted_hash_not_the_client_identifier(): void {
		$database = new wpdb();
		$fixture_uuid = '00000000-0000-4000-8000-000000000444';
		$database->rows['wp_instascore_fixtures'][ $fixture_uuid ] = array( 'fixture_id' => 44, 'competition_id' => 2, 'stream_id' => 9 );
		$service = new StreamAnalyticsService( new StreamAnalyticsRepository( $database ) );
		$client_id = 'client-session-0000000000000001';

		$service->engage( $fixture_uuid, array( 'sessionId' => $client_id, 'action' => 'heartbeat', 'device' => 'mobile', 'watchSeconds' => 61 ), 0 );

		$rows = array_values( $database->rows['wp_instascore_stream_view_sessions'] ?? array() );
		$this->assertCount( 1, $rows );
		$this->assertNotSame( $client_id, $rows[0]['session_hash'] );
		$this->assertSame( 64, strlen( $rows[0]['session_hash'] ) );
		$this->assertSame( 61, $rows[0]['watch_seconds'] );
		$this->assertArrayNotHasKey( 'ip_address', $rows[0] );
	}
}
