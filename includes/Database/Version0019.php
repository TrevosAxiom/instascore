<?php
/**
 * Permanent canonical provider match storage.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0019 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 19; }
	public function name(): string { return 'create_canonical_provider_matches'; }
	public function checksum(): string { return hash( 'sha256', $this->schema() ); }
	public function up(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $this->schema() );
	}
	public function schema(): string {
		$table = $this->database->prefix . 'instascore_provider_matches';
		$collate = $this->database->get_charset_collate();
		return "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			provider_name varchar(100) NOT NULL,
			sport_slug varchar(32) NOT NULL,
			provider_match_id varchar(100) NOT NULL,
			competition_provider_id varchar(100) NOT NULL,
			season_provider_id varchar(100) NOT NULL DEFAULT '',
			home_team_provider_id varchar(100) NOT NULL,
			away_team_provider_id varchar(100) NOT NULL,
			kickoff_at datetime NOT NULL,
			status varchar(32) NOT NULL,
			status_short varchar(32) NOT NULL DEFAULT '',
			home_score int NOT NULL DEFAULT 0,
			away_score int NOT NULL DEFAULT 0,
			payload_json longtext NOT NULL,
			first_seen_at datetime NOT NULL,
			last_seen_at datetime NOT NULL,
			completed_at datetime NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY provider_sport_match (provider_name,sport_slug,provider_match_id),
			KEY sport_kickoff (sport_slug,kickoff_at),
			KEY status_kickoff (status,kickoff_at),
			KEY competition_kickoff (competition_provider_id,kickoff_at)
		) {$collate};";
	}
}
