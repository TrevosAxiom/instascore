<?php
/**
 * Fixture livestream schema and YouTube URL tests.
 *
 * @package InstaScore_Platform
 */

use InstaScore\Platform\Database\Version0016;
use InstaScore\Platform\Repositories\FixtureStreamRepository;
use InstaScore\Platform\Services\FixtureStreamService;
use InstaScore\Platform\Services\YouTubeLiveService;
use InstaScore\Platform\REST\FixtureController;
use PHPUnit\Framework\TestCase;

final class FixtureStreamTest extends TestCase {
	public function test_fixture_stream_schema_has_fixture_provider_uniqueness_and_status_index(): void {
		$sql = ( new Version0016( new wpdb() ) )->schemas()[0];
		$this->assertStringContainsString( 'instascore_fixture_streams', $sql );
		$this->assertStringContainsString( 'UNIQUE KEY fixture_provider (fixture_id, provider)', $sql );
		$this->assertStringContainsString( 'KEY status_start (status, scheduled_start)', $sql );
	}

	/** @dataProvider youtube_urls */
	public function test_youtube_url_normalization( string $value, string $expected ): void {
		$service = new FixtureStreamService( new FixtureStreamRepository( new wpdb() ) );
		$this->assertSame( $expected, $service->youtube_video_id( $value ) );
	}

	public static function youtube_urls(): array {
		return array(
			'video id' => array( 'M7lc1UVf-VE', 'M7lc1UVf-VE' ),
			'watch url' => array( 'https://www.youtube.com/watch?v=M7lc1UVf-VE', 'M7lc1UVf-VE' ),
			'short url' => array( 'https://youtu.be/M7lc1UVf-VE?t=30', 'M7lc1UVf-VE' ),
			'live url' => array( 'https://youtube.com/live/M7lc1UVf-VE', 'M7lc1UVf-VE' ),
			'embed url' => array( 'https://www.youtube.com/embed/M7lc1UVf-VE', 'M7lc1UVf-VE' ),
		);
	}

	public function test_non_youtube_url_is_rejected(): void {
		$service = new FixtureStreamService( new FixtureStreamRepository( new wpdb() ) );
		$this->assertNull( $service->youtube_video_id( 'https://example.com/watch?v=M7lc1UVf-VE' ) );
	}

	public function test_fixture_presenter_exposes_only_public_stream_summaries(): void {
		$row = array(
			'uuid' => '00000000-0000-4000-8000-000000000001', 'status' => 'live', 'kickoff_at' => '2026-08-01 12:00:00',
			'home_team_uuid' => 'home', 'home_team_name' => 'Wolverines', 'home_team_logo_url' => 'https://media.test/wolverines.png',
			'away_team_uuid' => 'away', 'away_team_name' => 'Titans', 'away_team_logo_url' => 'https://media.test/titans.png',
			'stream_uuid' => '00000000-0000-4000-8000-000000000002', 'stream_video_id' => 'M7lc1UVf-VE',
			'stream_title' => 'Live game', 'stream_status' => 'live', 'stream_visibility' => 'unlisted',
			'stream_embed_enabled' => 1, 'stream_chat_enabled' => 0, 'stream_featured' => 1,
			'stream_replay_available' => 0, 'stream_thumbnail_url' => 'https://img.youtube.com/example.jpg',
		);
		$controller = new FixtureController();
		$public = $controller->present( $row );
		$this->assertSame( 'M7lc1UVf-VE', $public['stream']['videoId'] );
		$this->assertTrue( $public['stream']['featured'] );
		$this->assertSame( 'https://media.test/wolverines.png', $public['homeTeam']['logoUrl'] );

		$row['stream_visibility'] = 'private';
		$this->assertNull( $controller->present( $row )['stream'] );
	}

	public function test_youtube_fixture_matching_requires_team_names_and_rewards_close_kickoff(): void {
		$service = new YouTubeLiveService( new FixtureStreamRepository( new wpdb() ) );
		$fixtures = array(
			array(
				'uuid' => '00000000-0000-4000-8000-000000000010', 'kickoff_at' => '2026-08-01 15:00:00',
				'competition_name' => 'CFFL Lagos', 'home_team_name' => 'Lagos Wolverines', 'away_team_name' => 'Lagos Titans',
				'external_broadcast_id' => null,
			),
			array(
				'uuid' => '00000000-0000-4000-8000-000000000011', 'kickoff_at' => '2026-08-02 15:00:00',
				'competition_name' => 'CFFL Lagos', 'home_team_name' => 'Hawks', 'away_team_name' => 'Spartans',
				'external_broadcast_id' => null,
			),
		);
		$suggestions = $service->fixture_suggestions(
			array( 'videoId' => 'M7lc1UVf-VE', 'title' => 'CFFL Lagos: Lagos Wolverines vs Lagos Titans', 'scheduledStart' => '2026-08-01T15:05:00Z' ),
			$fixtures
		);
		$this->assertSame( '00000000-0000-4000-8000-000000000010', $suggestions[0]['fixtureUuid'] );
		$this->assertSame( 'high', $suggestions[0]['confidence'] );
		$this->assertSame( 100, $suggestions[0]['score'] );
		$this->assertContains( 'Both team names match', $suggestions[0]['reasons'] );
	}
}
