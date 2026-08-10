<?php
/**
 * Migration 0012: administration, reports and operations.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0012 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 12;
	}

	public function name(): string {
		return 'create_operations_controls';
	}

	public function checksum(): string {
		return hash( 'sha256', implode( "\n", $this->schemas() ) );
	}

	public function up(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		foreach ( $this->schemas() as $schema ) {
			dbDelta( $schema );
		}

		add_option( 'instascore_feature_flags', array( 'providerSync' => true, 'fantasy' => true, 'pushNotifications' => true ), '', false );
		add_option( 'instascore_maintenance_mode', false, '', false );
		add_option( 'instascore_data_retention_days', 365, '', false );
		add_option( 'instascore_admin_notification_disable', false, '', false );
	}

	public function schemas(): array {
		$prefix  = $this->database->prefix . 'instascore_';
		$collate = $this->database->get_charset_collate();
		return array(
			"CREATE TABLE {$prefix}operations_alerts (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				severity varchar(20) NOT NULL DEFAULT 'info',
				source varchar(80) NOT NULL,
				message text NOT NULL,
				payload_json longtext NULL,
				status varchar(20) NOT NULL DEFAULT 'open',
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY source_status (source, status),
				KEY severity_created (severity, created_at)
			) {$collate};",
			"CREATE TABLE {$prefix}operations_exports (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				export_type varchar(80) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'completed',
				requested_by bigint(20) unsigned NOT NULL,
				redacted tinyint(1) NOT NULL DEFAULT 1,
				row_count int unsigned NOT NULL DEFAULT 0,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY type_created (export_type, created_at),
				KEY requested_by (requested_by)
			) {$collate};",
			"CREATE TABLE {$prefix}operations_actions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				action varchar(80) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'completed',
				requested_by bigint(20) unsigned NOT NULL,
				input_json longtext NULL,
				result_json longtext NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY action_created (action, created_at),
				KEY status_created (status, created_at)
			) {$collate};",
		);
	}
}
