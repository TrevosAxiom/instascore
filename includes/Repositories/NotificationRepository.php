<?php
/**
 * Notification storage helpers.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use InstaScore\Platform\Notifications\NotificationCategory;

final class NotificationRepository extends BaseRepository {
	public function __construct( \wpdb $database ) {
		parent::__construct( $database, 'notification_preferences' );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function preferences_for_user( int $user_id ): array {
		$table = $this->table_name( 'notification_preferences' );
		$rows  = $this->database->get_results(
			$this->database->prepare( "SELECT * FROM {$table} WHERE user_id = %d", $user_id ), // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);

		$indexed = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$indexed[ (string) $row['category'] ] = $row;
		}

		foreach ( NotificationCategory::all() as $category ) {
			if ( ! isset( $indexed[ $category ] ) ) {
				$indexed[ $category ] = array(
					'category'            => $category,
					'enabled'             => true,
					'quiet_hours_start'   => '',
					'quiet_hours_end'     => '',
					'timezone'            => wp_timezone_string(),
				);
			}
		}

		return array_values( $indexed );
	}

	/**
	 * @param array<int,array<string,mixed>> $preferences Preferences to upsert.
	 */
	public function save_preferences( int $user_id, array $preferences ): void {
		$table = $this->table_name( 'notification_preferences' );
		foreach ( $preferences as $preference ) {
			$category = sanitize_key( (string) ( $preference['category'] ?? '' ) );
			if ( ! in_array( $category, NotificationCategory::all(), true ) ) {
				continue;
			}

			$this->database->replace(
				$table,
				array(
					'uuid'              => wp_generate_uuid4(),
					'user_id'           => $user_id,
					'category'          => $category,
					'enabled'           => empty( $preference['enabled'] ) ? 0 : 1,
					'quiet_hours_start' => sanitize_text_field( (string) ( $preference['quietHoursStart'] ?? $preference['quiet_hours_start'] ?? '' ) ),
					'quiet_hours_end'   => sanitize_text_field( (string) ( $preference['quietHoursEnd'] ?? $preference['quiet_hours_end'] ?? '' ) ),
					'timezone'          => sanitize_text_field( (string) ( $preference['timezone'] ?? wp_timezone_string() ) ),
					'updated_at'        => gmdate( 'Y-m-d H:i:s' ),
				),
				array( '%s', '%d', '%s', '%d', '%s', '%s', '%s', '%s' )
			);
		}
	}

	/**
	 * @param array<string,mixed> $subscription Subscription payload.
	 */
	public function sync_subscription( int $user_id, string $user_uuid, array $subscription ): void {
		$table           = $this->table_name( 'notification_subscriptions' );
		$subscription_id = sanitize_text_field( (string) ( $subscription['subscriptionId'] ?? '' ) );
		if ( '' === $subscription_id ) {
			return;
		}

		$this->database->replace(
			$table,
			array(
				'uuid'            => wp_generate_uuid4(),
				'user_id'         => $user_id,
				'user_uuid'       => $user_uuid,
				'onesignal_id'    => sanitize_text_field( (string) ( $subscription['oneSignalId'] ?? '' ) ),
				'subscription_id' => $subscription_id,
				'device_label'    => sanitize_text_field( (string) ( $subscription['deviceLabel'] ?? '' ) ),
				'status'          => sanitize_key( (string) ( $subscription['status'] ?? 'active' ) ),
				'last_seen_at'    => gmdate( 'Y-m-d H:i:s' ),
				'created_at'      => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'      => gmdate( 'Y-m-d H:i:s' ),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	public function record_follow( int $user_id, string $entity_type, string $entity_uuid, string $status = 'active' ): void {
		$this->database->replace(
			$this->table_name( 'notification_follows' ),
			array(
				'uuid'        => wp_generate_uuid4(),
				'user_id'     => $user_id,
				'entity_type' => sanitize_key( $entity_type ),
				'entity_uuid' => sanitize_text_field( $entity_uuid ),
				'status'      => sanitize_key( $status ),
				'created_at'  => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'  => gmdate( 'Y-m-d H:i:s' ),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	private function table_name( string $entity ): string {
		return $this->database->prefix . 'instascore_' . $entity;
	}
}
