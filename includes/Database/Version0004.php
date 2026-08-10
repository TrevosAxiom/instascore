<?php
/**
 * Migration 0004: fixtures and scheduling.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0004 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 4;
	}

	public function name(): string {
		return 'create_fixture_domain';
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
		$shared  = "
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			uuid char(36) NOT NULL,
			status varchar(20) NOT NULL DEFAULT 'draft',
			source varchar(20) NOT NULL DEFAULT 'internal',
			provider_name varchar(100) NULL,
			provider_object_id varchar(191) NULL,
			created_by bigint(20) unsigned NULL,
			updated_by bigint(20) unsigned NULL,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			revision bigint(20) unsigned NOT NULL DEFAULT 1";

		return array(
			"CREATE TABLE {$prefix}fixtures (
				{$shared},
				competition_id bigint(20) unsigned NOT NULL,
				season_id bigint(20) unsigned NOT NULL,
				stage_id bigint(20) unsigned NULL,
				group_id bigint(20) unsigned NULL,
				home_team_id bigint(20) unsigned NOT NULL,
				away_team_id bigint(20) unsigned NOT NULL,
				venue_id bigint(20) unsigned NULL,
				kickoff_at datetime NOT NULL,
				timezone varchar(64) NOT NULL DEFAULT 'UTC',
				round_name varchar(120) NULL,
				match_day int unsigned NULL,
				leg_number tinyint unsigned NULL,
				bracket_slot varchar(80) NULL,
				home_source_fixture_id bigint(20) unsigned NULL,
				away_source_fixture_id bigint(20) unsigned NULL,
				winner_next_fixture_id bigint(20) unsigned NULL,
				loser_next_fixture_id bigint(20) unsigned NULL,
				metadata_json longtext NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY competition_kickoff (competition_id, kickoff_at),
				KEY season_status_kickoff (season_id, status, kickoff_at),
				KEY stage_group (stage_id, group_id),
				KEY home_team_kickoff (home_team_id, kickoff_at),
				KEY away_team_kickoff (away_team_id, kickoff_at),
				KEY venue_kickoff (venue_id, kickoff_at),
				KEY status_kickoff (status, kickoff_at),
				KEY provider_identity (provider_name, provider_object_id),
				KEY bracket_links (winner_next_fixture_id, loser_next_fixture_id)
			) {$collate};",
			"CREATE TABLE {$prefix}fixture_officials (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fixture_id bigint(20) unsigned NOT NULL,
				official_id bigint(20) unsigned NOT NULL,
				role varchar(40) NOT NULL DEFAULT 'referee',
				status varchar(20) NOT NULL DEFAULT 'active',
				created_by bigint(20) unsigned NULL,
				updated_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY fixture_official_role (fixture_id, official_id, role),
				KEY fixture_status (fixture_id, status),
				KEY official_status (official_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}fixture_status_history (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fixture_id bigint(20) unsigned NOT NULL,
				from_status varchar(20) NULL,
				to_status varchar(20) NOT NULL,
				reason text NULL,
				actor_user_id bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY fixture_created (fixture_id, created_at),
				KEY to_status_created (to_status, created_at)
			) {$collate};",
		);
	}
}
