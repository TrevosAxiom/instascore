<?php
/**
 * Notification event creation and durable queue processing.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Notifications;

use InstaScore\Platform\Domain\ScoreReducer;
use InstaScore\Platform\Repositories\FixtureRepository;
use InstaScore\Platform\Repositories\MatchEventRepository;
use InstaScore\Platform\Repositories\NotificationJobRepository;
use Throwable;
use wpdb;

final class NotificationDispatcher {
	private const MAX_ATTEMPTS = 5;

	public function __construct(
		private readonly wpdb $database,
		private readonly NotificationJobRepository $jobs,
		private readonly OneSignalAdapter $adapter
	) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb, new NotificationJobRepository( $wpdb ), new OneSignalAdapter() );
	}

	/** @param array<string,mixed> $event */
	public function score_event( string $fixture_uuid, array $event ): void {
		if ( ! empty( $event['voided_at'] ) || 0 === (int) ( $event['points'] ?? 0 ) ) {
			return;
		}
		$fixture = $this->fixture( $fixture_uuid );
		if ( null === $fixture ) {
			return;
		}
		$score = $this->score( $fixture );
		$scoring_team = 'away' === (string) ( $event['team_side'] ?? '' ) ? (string) $fixture['away_team_name'] : (string) $fixture['home_team_name'];
		$this->enqueue_fixture(
			$fixture,
			(string) $event['uuid'],
			'score_event',
			NotificationCategory::SCORE_CHANGE,
			'score-' . $fixture_uuid . '-' . (string) $event['uuid'],
			ucwords( str_replace( '_', ' ', (string) $event['event_type'] ) ) . ' — ' . $scoring_team,
			$this->scoreline( $fixture, $score ),
			120
		);
	}

	/** @param array<string,mixed> $before @param array<string,mixed> $after */
	public function fixture_updated( array $before, array $after ): void {
		$fixture = $this->fixture( (string) $after['uuid'] );
		if ( null === $fixture ) {
			return;
		}
		$changed = array();
		foreach ( array( 'kickoff_at' => 'kickoff time', 'venue_id' => 'venue', 'status' => 'status' ) as $field => $label ) {
			if ( (string) ( $before[ $field ] ?? '' ) !== (string) ( $after[ $field ] ?? '' ) ) {
				$changed[] = $label;
			}
		}
		if ( array() !== $changed ) {
			$this->enqueue_fixture(
				$fixture,
				(string) $fixture['uuid'],
				'fixture_updated',
				NotificationCategory::FIXTURE_CHANGE,
				'fixture-' . (string) $fixture['uuid'] . '-r' . (int) ( $after['revision'] ?? 0 ),
				'Fixture updated',
				(string) $fixture['home_team_name'] . ' vs ' . (string) $fixture['away_team_name'] . ': ' . implode( ', ', $changed ) . ' changed.',
				DAY_IN_SECONDS
			);
		}

		$status = (string) ( $after['status'] ?? '' );
		if ( 'live' === $status && 'live' !== (string) ( $before['status'] ?? '' ) ) {
			$this->enqueue_fixture(
				$fixture,
				(string) $fixture['uuid'],
				'match_live',
				NotificationCategory::MATCH_LIVE,
				'live-' . (string) $fixture['uuid'],
				'Match is live',
				(string) $fixture['home_team_name'] . ' vs ' . (string) $fixture['away_team_name'] . ' has started.',
				300
			);
		}

		if ( in_array( $status, array( 'completed', 'confirmed' ), true ) && ! in_array( (string) ( $before['status'] ?? '' ), array( 'completed', 'confirmed' ), true ) ) {
			$this->enqueue_fixture(
				$fixture,
				(string) $fixture['uuid'],
				'final_score',
				NotificationCategory::FINAL_SCORE,
				'final-' . (string) $fixture['uuid'],
				'Full time',
				$this->scoreline( $fixture, $this->score( $fixture ) ),
				DAY_IN_SECONDS
			);
		}
	}

	/** Queue reminders for fixtures beginning roughly 15 minutes from now. */
	public function queue_starting_reminders(): int {
		$fixtures = new FixtureRepository( $this->database, 'fixtures' );
		$result = $fixtures->public_list(
			array(
				'fromUtc' => gmdate( 'Y-m-d H:i:s', time() + ( 14 * MINUTE_IN_SECONDS ) ),
				'toUtc'   => gmdate( 'Y-m-d H:i:s', time() + ( 16 * MINUTE_IN_SECONDS ) ),
				'status'  => 'scheduled',
				'perPage' => 100,
			)
		);
		$count = 0;
		foreach ( $result['items'] as $fixture ) {
			$queued = $this->enqueue_fixture(
				$fixture,
				(string) $fixture['uuid'],
				'match_starting',
				NotificationCategory::MATCH_STARTING,
				'starting-' . (string) $fixture['uuid'],
				'Match starts in 15 minutes',
				(string) $fixture['home_team_name'] . ' vs ' . (string) $fixture['away_team_name'],
				900
			);
			$count += $queued ? 1 : 0;
		}
		return $count;
	}

	public function process_due( int $limit = 20 ): array {
		$summary = array( 'sent' => 0, 'suppressed' => 0, 'retrying' => 0, 'failed' => 0 );
		foreach ( $this->jobs->due( $limit ) as $job ) {
			if ( ! $this->jobs->claim( (string) $job['uuid'] ) ) {
				continue;
			}
			$attempts = (int) $job['attempt_count'] + 1;
			try {
				$payload = json_decode( (string) $job['payload_json'], true, 512, JSON_THROW_ON_ERROR );
				$entities = is_array( $payload['entities'] ?? null ) ? $payload['entities'] : array();
				$target_users = is_array( $payload['targetUserIds'] ?? null ) ? $payload['targetUserIds'] : array();
				$recipients = $this->jobs->recipients( (string) $job['category'], $entities, $target_users );
				if ( array() === $recipients ) {
					$this->jobs->finish( (string) $job['uuid'], 'suppressed', $attempts, 'No eligible subscribed recipients.' );
					++$summary['suppressed'];
					continue;
				}
				$result = $this->adapter->send( array_column( $recipients, 'userUuid' ), $payload );
				$status = (string) ( $result['status'] ?? 'failed' );
				if ( 'sent' === $status ) {
					$this->jobs->finish( (string) $job['uuid'], 'sent', $attempts );
					foreach ( $recipients as $recipient ) {
						$this->jobs->log_delivery( $job, $recipient, 'sent', $result );
					}
					++$summary['sent'];
					continue;
				}
				if ( 'disabled' === $status ) {
					$this->jobs->finish( (string) $job['uuid'], 'suppressed', $attempts, 'Notifications disabled.' );
					++$summary['suppressed'];
					continue;
				}
				$this->retry_or_fail( $job, $recipients, $result, $attempts, $summary );
			} catch ( Throwable $error ) {
				$this->retry_or_fail( $job, array(), array( 'error' => $error->getMessage() ), $attempts, $summary );
			}
		}
		return $summary;
	}

	/** @param array<string,mixed> $fixture */
	private function enqueue_fixture( array $fixture, string $event_uuid, string $event_type, string $category, string $collapse_key, string $title, string $body, int $ttl ): bool {
		return $this->jobs->enqueue(
			$event_uuid,
			$event_type,
			$category,
			$collapse_key,
			array(
				'title'       => $title,
				'body'        => $body,
				'launchUrl'   => home_url( '/fixtures/' . (string) $fixture['uuid'] ),
				'category'    => $category,
				'eventUuid'   => $event_uuid,
				'collapseKey' => $collapse_key,
				'idempotencyKey' => wp_generate_uuid4(),
				'ttl'         => $ttl,
				'entities'    => array(
					array( 'type' => 'team', 'uuid' => (string) $fixture['home_team_uuid'] ),
					array( 'type' => 'team', 'uuid' => (string) $fixture['away_team_uuid'] ),
					array( 'type' => 'competition', 'uuid' => (string) $fixture['competition_uuid'] ),
				),
			)
		);
	}

	/** @param array<string,mixed> $fixture */
	private function score( array $fixture ): array {
		$events = ( new MatchEventRepository( $this->database, 'match_events' ) )->for_fixture( (int) $fixture['id'] );
		return ( new ScoreReducer() )->reduce( $events );
	}

	/** @param array<string,mixed> $fixture @param array{home:int,away:int} $score */
	private function scoreline( array $fixture, array $score ): string {
		return sprintf( '%s %d–%d %s', $fixture['home_team_name'], $score['home'], $score['away'], $fixture['away_team_name'] );
	}

	private function fixture( string $uuid ): ?array {
		return ( new FixtureRepository( $this->database, 'fixtures' ) )->find_public_by_uuid( $uuid );
	}

	/** @param array<int,array<string,mixed>> $recipients @param array<string,mixed> $result @param array<string,int> $summary */
	private function retry_or_fail( array $job, array $recipients, array $result, int $attempts, array &$summary ): void {
		$error = (string) ( $result['error'] ?? 'OneSignal rejected the notification.' );
		$final = $attempts >= self::MAX_ATTEMPTS || 'not_configured' === (string) ( $result['status'] ?? '' );
		$status = $final ? 'failed' : 'retrying';
		$delay = min( HOUR_IN_SECONDS, ( 2 ** $attempts ) * MINUTE_IN_SECONDS );
		$this->jobs->finish( (string) $job['uuid'], $status, $attempts, $error, gmdate( 'Y-m-d H:i:s', time() + $delay ) );
		foreach ( $recipients as $recipient ) {
			$this->jobs->log_delivery( $job, $recipient, $status, $result );
		}
		++$summary[ $status ];
	}
}
