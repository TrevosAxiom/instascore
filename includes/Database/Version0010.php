<?php
/**
 * Migration 0010: fantasy foundation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0010 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 10;
	}

	public function name(): string {
		return 'create_fantasy_foundation';
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
			"CREATE TABLE {$prefix}fantasy_games (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				sport_id bigint(20) unsigned NOT NULL,
				name varchar(191) NOT NULL,
				slug varchar(191) NOT NULL,
				description text NULL,
				status varchar(30) NOT NULL DEFAULT 'draft',
				budget_cents int unsigned NOT NULL DEFAULT 100000,
				squad_size smallint unsigned NOT NULL DEFAULT 15,
				starting_size smallint unsigned NOT NULL DEFAULT 7,
				bench_size smallint unsigned NOT NULL DEFAULT 8,
				max_players_per_team smallint unsigned NOT NULL DEFAULT 3,
				formation_rules_json longtext NOT NULL,
				created_by bigint(20) unsigned NULL,
				updated_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY slug (slug),
				KEY sport_status (sport_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_seasons (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NULL,
				name varchar(191) NOT NULL,
				status varchar(30) NOT NULL DEFAULT 'draft',
				start_at datetime NOT NULL,
				end_at datetime NOT NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY game_status (fantasy_game_id, status),
				KEY season_id (season_id)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_gameweeks (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_season_id bigint(20) unsigned NOT NULL,
				name varchar(191) NOT NULL,
				sequence_number int unsigned NOT NULL,
				deadline_at datetime NOT NULL,
				status varchar(30) NOT NULL DEFAULT 'scheduled',
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY season_sequence (fantasy_season_id, sequence_number),
				KEY deadline_status (deadline_at, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_positions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				code varchar(30) NOT NULL,
				name varchar(80) NOT NULL,
				min_squad smallint unsigned NOT NULL DEFAULT 0,
				max_squad smallint unsigned NOT NULL DEFAULT 15,
				min_starting smallint unsigned NOT NULL DEFAULT 0,
				max_starting smallint unsigned NOT NULL DEFAULT 15,
				sort_order smallint unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY game_code (fantasy_game_id, code)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_players (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				player_id bigint(20) unsigned NOT NULL,
				team_id bigint(20) unsigned NULL,
				position_id bigint(20) unsigned NOT NULL,
				price_cents int unsigned NOT NULL,
				status varchar(30) NOT NULL DEFAULT 'available',
				metadata_json longtext NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY game_player (fantasy_game_id, player_id),
				KEY game_status_price (fantasy_game_id, status, price_cents),
				KEY team_id (team_id),
				KEY position_id (position_id)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_squads (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				fantasy_game_id bigint(20) unsigned NOT NULL,
				fantasy_season_id bigint(20) unsigned NOT NULL,
				gameweek_id bigint(20) unsigned NOT NULL,
				name varchar(191) NOT NULL,
				status varchar(30) NOT NULL DEFAULT 'draft',
				revision int unsigned NOT NULL DEFAULT 1,
				total_cost_cents int unsigned NOT NULL DEFAULT 0,
				submitted_at datetime NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY user_gameweek (user_id, fantasy_game_id, gameweek_id),
				KEY gameweek_status (gameweek_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_squad_players (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				squad_id bigint(20) unsigned NOT NULL,
				fantasy_player_id bigint(20) unsigned NOT NULL,
				slot_type varchar(20) NOT NULL DEFAULT 'bench',
				slot_number smallint unsigned NOT NULL DEFAULT 0,
				is_captain tinyint(1) NOT NULL DEFAULT 0,
				is_vice_captain tinyint(1) NOT NULL DEFAULT 0,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY squad_player (squad_id, fantasy_player_id),
				KEY squad_slot (squad_id, slot_type, slot_number)
			) {$collate};",
			"CREATE TABLE {$prefix}fantasy_squad_history (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				squad_id bigint(20) unsigned NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				revision int unsigned NOT NULL,
				action varchar(30) NOT NULL,
				snapshot_json longtext NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY squad_revision (squad_id, revision),
				KEY user_created (user_id, created_at)
			) {$collate};",
		);
	}
}
