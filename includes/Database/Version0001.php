<?php
/**
 * Migration 0001: migration ledger.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0001 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 1;
	}

	public function name(): string {
		return 'create_migration_ledger';
	}

	public function checksum(): string {
		return hash( 'sha256', $this->schema() );
	}

	public function up(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $this->schema() );
	}

	private function schema(): string {
		$table_name      = $this->database->prefix . 'instascore_migrations';
		$charset_collate = $this->database->get_charset_collate();

		return "CREATE TABLE {$table_name} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            version bigint(20) unsigned NOT NULL,
            name varchar(191) NOT NULL,
            checksum char(64) NOT NULL,
            applied_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY version (version)
        ) {$charset_collate};";
	}
}
