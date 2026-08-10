<?php
/**
 * Migration 0015: durable provider response snapshots.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0015 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 15; }
	public function name(): string { return 'create_provider_snapshots'; }
	public function checksum(): string { return hash( 'sha256', implode( "\n", $this->schemas() ) ); }
	public function up(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		foreach ( $this->schemas() as $schema ) { dbDelta( $schema ); }
	}
	/** @return array<int,string> */
	public function schemas(): array {
		$table = $this->database->prefix . 'instascore_provider_snapshots';
		$collate = $this->database->get_charset_collate();
		return array(
			"CREATE TABLE {$table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				provider_name varchar(100) NOT NULL,
				sport_slug varchar(80) NOT NULL,
				sync_type varchar(80) NOT NULL,
				payload_json longtext NOT NULL,
				item_count int unsigned NOT NULL DEFAULT 0,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY provider_sync (provider_name, sync_type),
				KEY sport_updated (sport_slug, updated_at)
			) {$collate};",
		);
	}
}
