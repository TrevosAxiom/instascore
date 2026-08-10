<?php
/**
 * Migration 0011: fantasy scoring, transfers and leagues.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0011 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 11;
	}

	public function name(): string {
		return 'create_fantasy_scoring_transfers_leagues';
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

	public function schemas(): array {
		$prefix  = $this->database->prefix . 'instascore_';
		$collate = $this->database->get_charset_collate();
		return array(
			"CREATE TABLE {$prefix}fantasy_scoring_rules (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				sport_slug varchar(80) NOT NULL,
				event_type varchar(80) NOT NULL,
				points int NOT NULL DEFAULT 0,
				version int unsigned NOT NULL DEFAULT 1,
				effective_from datetime NOT NULL,
				effective_to datetime NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				conditions_json longtext NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY game_event_effective (fantasy_game_id, event_type, effective_from, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_points (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				gameweek_id bigint(20) unsigned NOT NULL,
				fixture_id bigint(20) unsigned NULL,
				match_event_id bigint(20) unsigned NULL,
				fantasy_player_id bigint(20) unsigned NOT NULL,
				player_id bigint(20) unsigned NOT NULL,
				points int NOT NULL DEFAULT 0,
				status varchar(20) NOT NULL DEFAULT 'provisional',
				rule_version int unsigned NOT NULL DEFAULT 1,
				breakdown_json longtext NOT NULL,
				revision int unsigned NOT NULL DEFAULT 1,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY event_player_revision (match_event_id, fantasy_player_id, revision),
				KEY gameweek_player (gameweek_id, fantasy_player_id, status),
				KEY fixture_status (fixture_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_point_revisions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_point_id bigint(20) unsigned NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				gameweek_id bigint(20) unsigned NOT NULL,
				fantasy_player_id bigint(20) unsigned NULL,
				revision int unsigned NOT NULL,
				action varchar(40) NOT NULL,
				points_before int NULL,
				points_after int NOT NULL,
				reason text NULL,
				snapshot_json longtext NOT NULL,
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY gameweek_revision (gameweek_id, revision),
				KEY player_revision (fantasy_player_id, revision)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_squad_totals (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				squad_id bigint(20) unsigned NOT NULL,
				gameweek_id bigint(20) unsigned NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				gameweek_points int NOT NULL DEFAULT 0,
				season_points int NOT NULL DEFAULT 0,
				rank_position int unsigned NULL,
				previous_rank_position int unsigned NULL,
				revision int unsigned NOT NULL DEFAULT 1,
				status varchar(20) NOT NULL DEFAULT 'provisional',
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY squad_gameweek (squad_id, gameweek_id),
				KEY gameweek_rank (gameweek_id, rank_position),
				KEY user_gameweek (user_id, gameweek_id)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_transfers (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				gameweek_id bigint(20) unsigned NOT NULL,
				squad_id bigint(20) unsigned NOT NULL,
				out_fantasy_player_id bigint(20) unsigned NULL,
				in_fantasy_player_id bigint(20) unsigned NOT NULL,
				cost_points int NOT NULL DEFAULT 0,
				free_transfer_used tinyint(1) NOT NULL DEFAULT 0,
				status varchar(20) NOT NULL DEFAULT 'completed',
				revision int unsigned NOT NULL DEFAULT 1,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY user_gameweek (user_id, gameweek_id),
				KEY squad_created (squad_id, created_at)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_leagues (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				name varchar(191) NOT NULL,
				visibility varchar(20) NOT NULL DEFAULT 'public',
				invite_code varchar(40) NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				created_by bigint(20) unsigned NOT NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY invite_code (invite_code),
				KEY game_visibility (fantasy_game_id, visibility, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_league_members (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				league_id bigint(20) unsigned NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				squad_id bigint(20) unsigned NULL,
				role varchar(20) NOT NULL DEFAULT 'member',
				status varchar(20) NOT NULL DEFAULT 'active',
				joined_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY league_user (league_id, user_id),
				KEY league_status (league_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_invite_attempts (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NULL,
				ip_hash varchar(191) NOT NULL,
				invite_code varchar(40) NOT NULL,
				status varchar(20) NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY code_created (invite_code, created_at),
				KEY ip_created (ip_hash, created_at)
			) {$collate};",
		);
	}
}
