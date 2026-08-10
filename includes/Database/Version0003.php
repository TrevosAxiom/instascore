<?php
/**
 * Migration 0003: teams, players, venues and registrations.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0003 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 3;
	}

	public function name(): string {
		return 'create_team_player_domain';
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
	 * Get table schemas.
	 *
	 * @return array<int,string>
	 */
	public function schemas(): array {
		$prefix  = $this->database->prefix . 'instascore_';
		$collate = $this->database->get_charset_collate();
		$shared  = "
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			uuid char(36) NOT NULL,
			status varchar(20) NOT NULL DEFAULT 'active',
			source varchar(20) NOT NULL DEFAULT 'internal',
			provider_name varchar(100) NULL,
			provider_object_id varchar(191) NULL,
			created_by bigint(20) unsigned NULL,
			updated_by bigint(20) unsigned NULL,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			revision bigint(20) unsigned NOT NULL DEFAULT 1";

		return array(
			"CREATE TABLE {$prefix}venues (
				{$shared},
				name varchar(160) NOT NULL,
				slug varchar(160) NOT NULL,
				city varchar(120) NULL,
				country_code char(2) NULL,
				address text NULL,
				metadata_json longtext NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY slug (slug),
				KEY status_city (status, city),
				KEY provider_identity (provider_name, provider_object_id)
			) {$collate};",
			"CREATE TABLE {$prefix}teams (
				{$shared},
				sport_id bigint(20) unsigned NOT NULL,
				name varchar(160) NOT NULL,
				slug varchar(160) NOT NULL,
				short_name varchar(40) NULL,
				home_venue_id bigint(20) unsigned NULL,
				logo_attachment_id bigint(20) unsigned NULL,
				logo_url varchar(500) NULL,
				logo_mime_type varchar(100) NULL,
				logo_size_bytes bigint(20) unsigned NULL,
				metadata_json longtext NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY sport_slug (sport_id, slug),
				KEY sport_status (sport_id, status),
				KEY home_venue (home_venue_id),
				KEY provider_identity (provider_name, provider_object_id)
			) {$collate};",
			"CREATE TABLE {$prefix}players (
				{$shared},
				sport_id bigint(20) unsigned NOT NULL,
				first_name varchar(100) NOT NULL,
				last_name varchar(100) NOT NULL,
				display_name varchar(160) NOT NULL,
				slug varchar(180) NOT NULL,
				date_of_birth date NULL,
				nationality char(2) NULL,
				primary_position varchar(60) NULL,
				eligibility_status varchar(30) NOT NULL DEFAULT 'eligible',
				photo_attachment_id bigint(20) unsigned NULL,
				photo_url varchar(500) NULL,
				photo_mime_type varchar(100) NULL,
				photo_size_bytes bigint(20) unsigned NULL,
				metadata_json longtext NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY sport_status (sport_id, status),
				KEY sport_slug (sport_id, slug),
				KEY provider_identity (provider_name, provider_object_id)
			) {$collate};",
			"CREATE TABLE {$prefix}team_registrations (
				{$shared},
				team_id bigint(20) unsigned NOT NULL,
				player_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				jersey_number smallint unsigned NULL,
				position_code varchar(40) NULL,
				registered_at datetime NOT NULL,
				unregistered_at datetime NULL,
				eligibility_status varchar(30) NOT NULL DEFAULT 'eligible',
				notes text NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY player_history (player_id, season_id, registered_at),
				KEY team_season_status (team_id, season_id, status),
				KEY active_player_season (player_id, season_id, status),
				KEY active_jersey (team_id, season_id, jersey_number, status)
			) {$collate};",
			"CREATE TABLE {$prefix}team_people (
				{$shared},
				team_id bigint(20) unsigned NOT NULL,
				user_id bigint(20) unsigned NULL,
				full_name varchar(160) NOT NULL,
				email varchar(191) NULL,
				role varchar(40) NOT NULL,
				started_at date NULL,
				ended_at date NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY team_role_status (team_id, role, status),
				KEY user_role (user_id, role)
			) {$collate};",
			"CREATE TABLE {$prefix}officials (
				{$shared},
				full_name varchar(160) NOT NULL,
				email varchar(191) NULL,
				phone varchar(60) NULL,
				official_type varchar(40) NOT NULL DEFAULT 'referee',
				country_code char(2) NULL,
				metadata_json longtext NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY type_status (official_type, status),
				KEY provider_identity (provider_name, provider_object_id)
			) {$collate};",
			"CREATE TABLE {$prefix}team_assignments (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				team_id bigint(20) unsigned NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				role varchar(40) NOT NULL DEFAULT 'team_admin',
				status varchar(20) NOT NULL DEFAULT 'active',
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY team_user_role_status (team_id, user_id, role, status),
				KEY user_status (user_id, status),
				KEY team_status (team_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}player_positions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				sport_id bigint(20) unsigned NOT NULL,
				code varchar(40) NOT NULL,
				name varchar(100) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY sport_code (sport_id, code),
				KEY sport_status (sport_id, status)
			) {$collate};",
		);
	}
}
