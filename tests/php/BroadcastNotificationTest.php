<?php

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Notifications\NotificationDispatcher;
use InstaScore\Platform\Notifications\OneSignalAdapter;
use InstaScore\Platform\Repositories\NotificationJobRepository;
use PHPUnit\Framework\TestCase;
use wpdb;

final class BroadcastNotificationTest extends TestCase {
	public function test_replay_transition_queues_a_follow_targeted_notification(): void {
		$database = new wpdb();
		$fixture_uuid = '00000000-0000-4000-8000-000000000444';
		$database->rows['wp_instascore_fixtures'][ $fixture_uuid ] = array(
			'id' => 44, 'uuid' => $fixture_uuid, 'home_team_uuid' => 'home-team', 'home_team_name' => 'Wolverines',
			'away_team_uuid' => 'away-team', 'away_team_name' => 'Titans', 'competition_uuid' => 'cffl-lagos',
		);
		$dispatcher = new NotificationDispatcher( $database, new NotificationJobRepository( $database ), new OneSignalAdapter() );

		$dispatcher->broadcast_status_changed( $fixture_uuid, 'replay_processing', 'replay_available' );

		$jobs = array_values( $database->rows['wp_instascore_notification_jobs'] ?? array() );
		$this->assertCount( 1, $jobs );
		$this->assertSame( 'replay_ready', $jobs[0]['category'] );
		$this->assertSame( 'replay-' . $fixture_uuid, $jobs[0]['collapse_key'] );
		$payload = json_decode( $jobs[0]['payload_json'], true, 512, JSON_THROW_ON_ERROR );
		$this->assertSame( 'https://instascore.test/fixtures/' . $fixture_uuid, $payload['launchUrl'] );
		$this->assertSame( array( 'team', 'team', 'competition' ), array_column( $payload['entities'], 'type' ) );
	}

	public function test_unchanged_broadcast_status_does_not_queue_an_alert(): void {
		$database = new wpdb();
		$dispatcher = new NotificationDispatcher( $database, new NotificationJobRepository( $database ), new OneSignalAdapter() );
		$dispatcher->broadcast_status_changed( '00000000-0000-4000-8000-000000000444', 'live', 'live' );
		$this->assertArrayNotHasKey( 'wp_instascore_notification_jobs', $database->rows );
	}
}
