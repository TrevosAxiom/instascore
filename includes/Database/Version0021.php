<?php
/** Team roster workflow storage. @package InstaScore_Platform */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0021 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 21; }
	public function name(): string { return 'create_team_roster_workflow'; }
	public function checksum(): string { return hash( 'sha256', $this->schema() ); }
	public function up(): void { require_once ABSPATH . 'wp-admin/includes/upgrade.php'; dbDelta( $this->schema() ); }
	public function schema(): string {
		$table = $this->database->prefix . 'instascore_roster_requests';
		$collate = $this->database->get_charset_collate();
		return "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			uuid char(36) NOT NULL,
			request_type varchar(30) NOT NULL,
			team_id bigint(20) unsigned NOT NULL,
			target_team_id bigint(20) unsigned NULL,
			player_id bigint(20) unsigned NOT NULL,
			season_id bigint(20) unsigned NOT NULL,
			registration_id bigint(20) unsigned NULL,
			proposed_json longtext NULL,
			status varchar(20) NOT NULL DEFAULT 'pending',
			requested_by bigint(20) unsigned NOT NULL,
			reviewed_by bigint(20) unsigned NULL,
			review_notes text NULL,
			requested_at datetime NOT NULL,
			reviewed_at datetime NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY uuid (uuid),
			KEY team_status (team_id,status),
			KEY target_status (target_team_id,status),
			KEY player_season (player_id,season_id),
			KEY requested_by_status (requested_by,status)
		) {$collate};";
	}
}
