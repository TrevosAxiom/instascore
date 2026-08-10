<?php
/**
 * Migration 0006: standings, statistics and discipline projections.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0006 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 6;
	}

	public function name(): string {
		return 'create_standings_statistics_discipline';
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
	 * @return array<int,string>
	 */
	public function schemas(): array {
		$prefix  = $this->database->prefix . 'instascore_';
		$collate = $this->database->get_charset_collate();

		return array(
			"CREATE TABLE {$prefix}standings (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				competition_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				stage_id bigint(20) unsigned NULL,
				group_id bigint(20) unsigned NULL,
				team_id bigint(20) unsigned NOT NULL,
				position int unsigned NOT NULL DEFAULT 0,
				played int unsigned NOT NULL DEFAULT 0,
				wins int unsigned NOT NULL DEFAULT 0,
				draws int unsigned NOT NULL DEFAULT 0,
				losses int unsigned NOT NULL DEFAULT 0,
				points int NOT NULL DEFAULT 0,
				points_for int NOT NULL DEFAULT 0,
				points_against int NOT NULL DEFAULT 0,
				point_difference int NOT NULL DEFAULT 0,
				form varchar(20) NOT NULL DEFAULT '',
				tiebreaker_json longtext NULL,
				rebuild_hash char(64) NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY standings_scope_team (competition_id, season_id, stage_id, group_id, team_id),
				KEY standings_scope_position (competition_id, season_id, stage_id, group_id, position),
				KEY team_id (team_id)
			) {$collate};",
			"CREATE TABLE {$prefix}standings_snapshots (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				competition_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				stage_id bigint(20) unsigned NULL,
				group_id bigint(20) unsigned NULL,
				snapshot_json longtext NOT NULL,
				rebuild_hash char(64) NOT NULL,
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY snapshot_scope (competition_id, season_id, stage_id, group_id, created_at)
			) {$collate};",
			"CREATE TABLE {$prefix}team_statistics (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				competition_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				team_id bigint(20) unsigned NOT NULL,
				stat_key varchar(80) NOT NULL,
				stat_value int NOT NULL DEFAULT 0,
				rebuild_hash char(64) NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY team_stat_scope (competition_id, season_id, team_id, stat_key),
				KEY stat_key_value (stat_key, stat_value)
			) {$collate};",
			"CREATE TABLE {$prefix}player_statistics (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				competition_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				team_id bigint(20) unsigned NULL,
				player_id bigint(20) unsigned NOT NULL,
				stat_key varchar(80) NOT NULL,
				stat_value int NOT NULL DEFAULT 0,
				rebuild_hash char(64) NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY player_stat_scope (competition_id, season_id, player_id, stat_key),
				KEY stat_key_value (stat_key, stat_value),
				KEY team_id (team_id)
			) {$collate};",
			"CREATE TABLE {$prefix}disciplinary_records (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				competition_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				fixture_id bigint(20) unsigned NULL,
				team_id bigint(20) unsigned NULL,
				player_id bigint(20) unsigned NULL,
				record_type varchar(40) NOT NULL,
				reason text NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				issued_by bigint(20) unsigned NULL,
				issued_at datetime NOT NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY player_status (player_id, status),
				KEY competition_season (competition_id, season_id)
			) {$collate};",
			"CREATE TABLE {$prefix}suspensions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				disciplinary_record_id bigint(20) unsigned NULL,
				competition_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				team_id bigint(20) unsigned NULL,
				player_id bigint(20) unsigned NOT NULL,
				starts_at datetime NULL,
				ends_at datetime NULL,
				fixtures_remaining int unsigned NOT NULL DEFAULT 0,
				status varchar(20) NOT NULL DEFAULT 'active',
				reason text NULL,
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY player_status (player_id, status),
				KEY suspension_scope (competition_id, season_id, team_id)
			) {$collate};",
		);
	}
}
