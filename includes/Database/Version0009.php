<?php
/**
 * Migration 0009: favourites and personalisation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0009 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 9;
	}

	public function name(): string {
		return 'create_favourites_personalisation';
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

	/**
	 * @return string[]
	 */
	public function schemas(): array {
		$prefix  = $this->database->prefix . 'instascore_';
		$collate = $this->database->get_charset_collate();

		return array(
			"CREATE TABLE {$prefix}user_favourites (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				entity_type varchar(40) NOT NULL,
				entity_uuid char(36) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				source varchar(20) NOT NULL DEFAULT 'server',
				alerts_enabled tinyint(1) NOT NULL DEFAULT 1,
				unfollowed_at datetime NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY user_entity (user_id, entity_type, entity_uuid),
				KEY user_status (user_id, status),
				KEY entity_status (entity_type, entity_uuid, status)
			) {$collate};",
			"CREATE TABLE {$prefix}user_preferences (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				timezone varchar(80) NOT NULL DEFAULT 'UTC',
				language varchar(20) NOT NULL DEFAULT 'en',
				preferred_sports_json longtext NOT NULL,
				privacy_version varchar(20) NOT NULL DEFAULT '1',
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY user_id (user_id)
			) {$collate};",
			"CREATE TABLE {$prefix}recent_views (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NULL,
				anonymous_id varchar(80) NULL,
				entity_type varchar(40) NOT NULL,
				entity_uuid char(36) NOT NULL,
				entity_label varchar(191) NULL,
				url varchar(500) NULL,
				viewed_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY user_viewed (user_id, viewed_at),
				KEY anonymous_viewed (anonymous_id, viewed_at)
			) {$collate};",
			"CREATE TABLE {$prefix}alert_history (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				category varchar(80) NOT NULL,
				entity_type varchar(40) NULL,
				entity_uuid char(36) NULL,
				title varchar(191) NOT NULL,
				body text NULL,
				launch_url varchar(500) NULL,
				delivery_status varchar(30) NOT NULL DEFAULT 'recorded',
				suppressed tinyint(1) NOT NULL DEFAULT 0,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY user_created (user_id, created_at),
				KEY entity_category (entity_type, entity_uuid, category)
			) {$collate};",
		);
	}
}
