<?php
/**
 * Migration 0008: external football provider foundations.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0008 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 8;
	}

	public function name(): string {
		return 'create_external_provider_foundations';
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
			"CREATE TABLE {$prefix}provider_mappings (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				provider_name varchar(80) NOT NULL,
				sport_slug varchar(80) NOT NULL,
				entity_type varchar(40) NOT NULL,
				provider_object_id varchar(191) NOT NULL,
				internal_uuid char(36) NULL,
				internal_table varchar(80) NULL,
				display_name varchar(191) NULL,
				status varchar(30) NOT NULL DEFAULT 'mapped',
				conflict_reason text NULL,
				raw_hash char(64) NULL,
				last_seen_at datetime NOT NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY provider_entity (provider_name, entity_type, provider_object_id),
				KEY internal_lookup (internal_table, internal_uuid),
				KEY status_seen (status, last_seen_at)
			) {$collate};",
			"CREATE TABLE {$prefix}provider_sync_logs (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				provider_name varchar(80) NOT NULL,
				sync_type varchar(60) NOT NULL,
				dry_run tinyint(1) NOT NULL DEFAULT 0,
				status varchar(30) NOT NULL DEFAULT 'queued',
				request_hash char(64) NOT NULL,
				filters_json longtext NOT NULL,
				preview_json longtext NULL,
				rate_limit_remaining int NULL,
				rate_limit_reset_at datetime NULL,
				retry_after_seconds int NULL,
				attempt_count int unsigned NOT NULL DEFAULT 0,
				error_code varchar(80) NULL,
				error_message text NULL,
				last_known_at datetime NULL,
				started_at datetime NOT NULL,
				finished_at datetime NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY provider_status (provider_name, status),
				KEY sync_type_created (sync_type, created_at),
				KEY request_hash (request_hash)
			) {$collate};",
		);
	}
}
