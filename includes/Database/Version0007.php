<?php
/**
 * Migration 0007: OneSignal push notification foundations.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0007 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 7;
	}

	public function name(): string {
		return 'create_push_notification_foundations';
	}

	public function checksum(): string {
		return hash( 'sha256', implode( "\n", $this->schemas() ) );
	}

	public function up(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		foreach ( $this->schemas() as $schema ) {
			dbDelta( $schema );
		}
	}

	public function schemas(): array {
		$prefix  = $this->database->prefix . 'instascore_';
		$collate = $this->database->get_charset_collate();

		return array(
			"CREATE TABLE {$prefix}notification_preferences (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				category varchar(80) NOT NULL,
				enabled tinyint(1) NOT NULL DEFAULT 1,
				quiet_hours_start varchar(5) NULL,
				quiet_hours_end varchar(5) NULL,
				timezone varchar(80) NOT NULL DEFAULT 'UTC',
				denied_at datetime NULL,
				dismissed_at datetime NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY user_category (user_id, category),
				KEY user_enabled (user_id, enabled)
			) {$collate};",
			"CREATE TABLE {$prefix}notification_subscriptions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				user_uuid char(36) NOT NULL,
				onesignal_id varchar(191) NULL,
				subscription_id varchar(191) NOT NULL,
				device_label varchar(120) NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				last_seen_at datetime NOT NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY subscription_id (subscription_id),
				KEY user_status (user_id, status),
				KEY user_uuid (user_uuid)
			) {$collate};",
			"CREATE TABLE {$prefix}notification_follows (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				entity_type varchar(40) NOT NULL,
				entity_uuid char(36) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY user_entity (user_id, entity_type, entity_uuid),
				KEY entity_status (entity_type, entity_uuid, status)
			) {$collate};",
			"CREATE TABLE {$prefix}notification_jobs (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				event_uuid char(36) NOT NULL,
				event_type varchar(80) NOT NULL,
				category varchar(80) NOT NULL,
				collapse_key varchar(191) NOT NULL,
				payload_json longtext NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'queued',
				attempt_count int unsigned NOT NULL DEFAULT 0,
				next_attempt_at datetime NOT NULL,
				last_error text NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY event_category_collapse (event_uuid, category, collapse_key),
				KEY status_next_attempt (status, next_attempt_at)
			) {$collate};",
			"CREATE TABLE {$prefix}notification_delivery_logs (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				job_uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NULL,
				subscription_id varchar(191) NULL,
				category varchar(80) NOT NULL,
				collapse_key varchar(191) NOT NULL,
				onesignal_message_id varchar(191) NULL,
				status varchar(20) NOT NULL,
				error text NULL,
				delivered_at datetime NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY job_subscription_category (job_uuid, subscription_id, category),
				KEY status_created (status, created_at)
			) {$collate};",
		);
	}
}
