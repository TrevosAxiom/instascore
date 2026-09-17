<?php
/**
 * Migration 0016: fixture-linked livestreams.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0016 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 16; }
	public function name(): string { return 'create_fixture_streams'; }
	public function checksum(): string { return hash( 'sha256', implode( "\n", $this->schemas() ) ); }
	public function up(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		foreach ( $this->schemas() as $schema ) { dbDelta( $schema ); }
	}
	/** @return array<int,string> */
	public function schemas(): array {
		$table   = $this->database->prefix . 'instascore_fixture_streams';
		$collate = $this->database->get_charset_collate();
		return array(
			"CREATE TABLE {$table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fixture_id bigint(20) unsigned NOT NULL,
				provider varchar(40) NOT NULL DEFAULT 'youtube',
				external_broadcast_id varchar(191) NOT NULL,
				channel_id varchar(191) NULL,
				title varchar(255) NOT NULL DEFAULT '',
				status varchar(40) NOT NULL DEFAULT 'scheduled',
				visibility varchar(20) NOT NULL DEFAULT 'unlisted',
				embed_enabled tinyint(1) unsigned NOT NULL DEFAULT 1,
				chat_enabled tinyint(1) unsigned NOT NULL DEFAULT 0,
				featured tinyint(1) unsigned NOT NULL DEFAULT 0,
				replay_available tinyint(1) unsigned NOT NULL DEFAULT 0,
				thumbnail_url text NULL,
				scheduled_start datetime NULL,
				actual_start datetime NULL,
				actual_end datetime NULL,
				last_synced_at datetime NULL,
				error_message text NULL,
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY fixture_provider (fixture_id, provider),
				KEY status_start (status, scheduled_start),
				KEY featured_status (featured, status)
			) {$collate};",
		);
	}
}
