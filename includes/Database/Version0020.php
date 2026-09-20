<?php
/** Security event audit storage. @package InstaScore_Platform */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0020 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 20; }
	public function name(): string { return 'create_security_event_log'; }
	public function checksum(): string { return hash( 'sha256', $this->schema() ); }
	public function up(): void { require_once ABSPATH . 'wp-admin/includes/upgrade.php'; dbDelta( $this->schema() ); }
	public function schema(): string {
		$table = $this->database->prefix . 'instascore_security_events';
		$collate = $this->database->get_charset_collate();
		return "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			uuid char(36) NOT NULL,
			event_type varchar(80) NOT NULL,
			severity varchar(20) NOT NULL DEFAULT 'info',
			user_id bigint(20) unsigned NULL,
			identity_hash char(64) NULL,
			ip_hash char(64) NULL,
			user_agent_hash char(64) NULL,
			context_json longtext NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY uuid (uuid),
			KEY event_created (event_type,created_at),
			KEY severity_created (severity,created_at),
			KEY user_created (user_id,created_at)
		) {$collate};";
	}
}
