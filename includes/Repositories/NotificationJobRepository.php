<?php
/**
 * Durable notification queue and delivery log persistence.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use DateTimeImmutable;
use InstaScore\Platform\Notifications\PreferenceFilter;
use wpdb;

final class NotificationJobRepository {
	public function __construct( private readonly wpdb $database ) {}

	/** @param array<string,mixed> $payload */
	public function enqueue( string $event_uuid, string $event_type, string $category, string $collapse_key, array $payload, ?string $run_at = null ): bool {
		$result = $this->database->insert(
			$this->table( 'notification_jobs' ),
			array(
				'uuid'            => wp_generate_uuid4(),
				'event_uuid'      => $event_uuid,
				'event_type'      => sanitize_key( $event_type ),
				'category'        => sanitize_key( $category ),
				'collapse_key'    => sanitize_text_field( $collapse_key ),
				'payload_json'    => wp_json_encode( $payload ) ?: '{}',
				'status'          => 'queued',
				'attempt_count'   => 0,
				'next_attempt_at' => $run_at ?? gmdate( 'Y-m-d H:i:s' ),
				'last_error'      => null,
				'created_at'      => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'      => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		// The schema's unique event/category/collapse key makes repeated event hooks safe.
		return false !== $result;
	}

	/** @return array<int,array<string,mixed>> */
	public function due( int $limit = 20 ): array {
		$limit = max( 1, min( 100, $limit ) );
		$table = $this->table( 'notification_jobs' );
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT * FROM {$table} WHERE status IN ('queued','retrying') AND next_attempt_at <= %s ORDER BY next_attempt_at ASC,id ASC LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				gmdate( 'Y-m-d H:i:s' ),
				$limit
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/** @return array{counts:array<string,int>,subscriptions:int,recent:array<int,array<string,mixed>>} */
	public function status(): array {
		$jobs = $this->table( 'notification_jobs' );
		$subscriptions = $this->table( 'notification_subscriptions' );
		$rows = $this->database->get_results( "SELECT status,COUNT(*) total FROM {$jobs} GROUP BY status", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$counts = array_fill_keys( array( 'queued', 'processing', 'retrying', 'sent', 'suppressed', 'failed' ), 0 );
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$counts[ (string) $row['status'] ] = (int) $row['total'];
		}
		$recent = $this->database->get_results(
			"SELECT uuid,event_type,category,status,attempt_count,next_attempt_at,last_error,created_at,updated_at FROM {$jobs} ORDER BY created_at DESC LIMIT 20", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);
		return array(
			'counts'        => $counts,
			'subscriptions' => (int) $this->database->get_var( "SELECT COUNT(*) FROM {$subscriptions} WHERE status='active'" ), // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			'recent'        => is_array( $recent ) ? $recent : array(),
		);
	}

	public function claim( string $uuid ): bool {
		$table = $this->table( 'notification_jobs' );
		$result = $this->database->query(
			$this->database->prepare(
				"UPDATE {$table} SET status='processing',updated_at=%s WHERE uuid=%s AND status IN ('queued','retrying')", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				gmdate( 'Y-m-d H:i:s' ),
				$uuid
			)
		);
		return 1 === $result;
	}

	public function finish( string $uuid, string $status, int $attempts, string $error = '', ?string $next_attempt = null ): void {
		$this->database->update(
			$this->table( 'notification_jobs' ),
			array(
				'status'          => sanitize_key( $status ),
				'attempt_count'   => $attempts,
				'next_attempt_at' => $next_attempt ?? gmdate( 'Y-m-d H:i:s' ),
				'last_error'      => sanitize_textarea_field( $error ),
				'updated_at'      => gmdate( 'Y-m-d H:i:s' ),
			),
			array( 'uuid' => $uuid )
		);
	}

	/**
	 * Resolve active subscribed users and enforce follows, category preferences and quiet hours.
	 *
	 * @param array<int,array{type:string,uuid:string}> $entities Audience entities.
	 * @param int[]                                    $target_user_ids Explicit recipients.
	 * @return array<int,array{userId:int,userUuid:string,subscriptionId:string}>
	 */
	public function recipients( string $category, array $entities = array(), array $target_user_ids = array() ): array {
		$subscriptions = $this->database->get_results(
			"SELECT user_id,user_uuid,subscription_id FROM {$this->table( 'notification_subscriptions' )} WHERE status='active' ORDER BY id DESC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);
		if ( ! is_array( $subscriptions ) || array() === $subscriptions ) {
			return array();
		}

		$target_user_ids = array_values( array_unique( array_map( 'intval', $target_user_ids ) ) );
		$allowed_by_follow = $this->followed_user_ids( $entities );
		$filter = new PreferenceFilter();
		$now = new DateTimeImmutable( 'now', new \DateTimeZone( 'UTC' ) );
		$preferences = new NotificationRepository( $this->database );
		$recipients = array();
		$seen = array();

		foreach ( $subscriptions as $subscription ) {
			$user_id = (int) $subscription['user_id'];
			if ( array() !== $target_user_ids && ! in_array( $user_id, $target_user_ids, true ) ) {
				continue;
			}
			if ( array() === $target_user_ids && array() !== $entities && ! in_array( $user_id, $allowed_by_follow, true ) ) {
				continue;
			}
			$user_preferences = $preferences->preferences_for_user( $user_id );
			$preference = current( array_filter( $user_preferences, static fn( array $item ): bool => $category === (string) $item['category'] ) );
			if ( is_array( $preference ) && ! $filter->allows( $preference, $now ) ) {
				continue;
			}
			$user_uuid = (string) $subscription['user_uuid'];
			if ( '' === $user_uuid || isset( $seen[ $user_uuid ] ) ) {
				continue;
			}
			$seen[ $user_uuid ] = true;
			$recipients[] = array(
				'userId'         => $user_id,
				'userUuid'       => $user_uuid,
				'subscriptionId' => (string) $subscription['subscription_id'],
			);
		}

		return $recipients;
	}

	/** @param array<string,mixed> $result */
	public function log_delivery( array $job, array $recipient, string $status, array $result = array() ): void {
		$this->database->insert(
			$this->table( 'notification_delivery_logs' ),
			array(
				'uuid'                  => wp_generate_uuid4(),
				'job_uuid'              => (string) $job['uuid'],
				'user_id'               => (int) $recipient['userId'],
				'subscription_id'        => (string) $recipient['subscriptionId'],
				'category'              => (string) $job['category'],
				'collapse_key'          => (string) $job['collapse_key'],
				'onesignal_message_id'  => sanitize_text_field( (string) ( $result['messageId'] ?? '' ) ),
				'status'                => sanitize_key( $status ),
				'error'                 => sanitize_textarea_field( (string) ( $result['error'] ?? '' ) ),
				'delivered_at'          => 'sent' === $status ? gmdate( 'Y-m-d H:i:s' ) : null,
				'created_at'            => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}

	/** @param array<int,array{type:string,uuid:string}> $entities */
	private function followed_user_ids( array $entities ): array {
		if ( array() === $entities ) {
			return array();
		}
		$clauses = array();
		$args = array();
		foreach ( $entities as $entity ) {
			$clauses[] = '(entity_type=%s AND entity_uuid=%s)';
			$args[] = sanitize_key( (string) $entity['type'] );
			$args[] = sanitize_text_field( (string) $entity['uuid'] );
		}
		$table = $this->table( 'notification_follows' );
		$sql = "SELECT DISTINCT user_id FROM {$table} WHERE status='active' AND (" . implode( ' OR ', $clauses ) . ')'; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$ids = $this->database->get_col( $this->database->prepare( $sql, $args ) );
		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	private function table( string $name ): string {
		return $this->database->prefix . 'instascore_' . $name;
	}
}
