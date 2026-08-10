<?php
/**
 * Migration 0013: competition branding media.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0013 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 13;
	}

	public function name(): string {
		return 'add_competition_branding_media';
	}

	public function checksum(): string {
		return hash( 'sha256', implode( "\n", $this->schemas() ) );
	}

	public function up(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		foreach ( $this->schemas() as $schema ) {
			dbDelta( $schema );
		}
		foreach ( array( 'instascore_league_administrator', 'instascore_competition_manager', 'instascore_team_administrator' ) as $role_name ) {
			$role = get_role( $role_name );
			if ( null !== $role ) {
				$role->add_cap( 'upload_files' );
			}
		}
	}

	/** @return array<int,string> */
	public function schemas(): array {
		$table   = $this->database->prefix . 'instascore_competitions';
		$collate = $this->database->get_charset_collate();
		return array(
			"CREATE TABLE {$table} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				logo_attachment_id bigint(20) unsigned NULL,
				logo_url varchar(500) NULL,
				logo_mime_type varchar(100) NULL,
				logo_size_bytes bigint(20) unsigned NULL,
				PRIMARY KEY  (id)
			) {$collate};",
		);
	}
}
