<?php
/**
 * Migration 0005: live flag-football scoring.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0005 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 5;
	}

	public function name(): string {
		return 'create_live_scoring_domain';
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
			"CREATE TABLE {$prefix}scorekeeper_assignments (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fixture_id bigint(20) unsigned NOT NULL,
				user_id bigint(20) unsigned NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				claimed_at datetime NULL,
				released_at datetime NULL,
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY fixture_user_status (fixture_id, user_id, status),
				KEY fixture_status (fixture_id, status),
				KEY user_status (user_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}match_clock_states (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fixture_id bigint(20) unsigned NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'not_started',
				period smallint unsigned NOT NULL DEFAULT 0,
				period_label varchar(40) NULL,
				clock_seconds int unsigned NOT NULL DEFAULT 0,
				running tinyint(1) NOT NULL DEFAULT 0,
				started_at datetime NULL,
				paused_at datetime NULL,
				revision bigint(20) unsigned NOT NULL DEFAULT 0,
				updated_by bigint(20) unsigned NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY fixture_id (fixture_id),
				KEY status_period (status, period)
			) {$collate};",
			"CREATE TABLE {$prefix}match_events (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fixture_id bigint(20) unsigned NOT NULL,
				client_event_id varchar(191) NOT NULL,
				sequence_number bigint(20) unsigned NOT NULL,
				revision bigint(20) unsigned NOT NULL,
				event_type varchar(40) NOT NULL,
				team_side varchar(10) NULL,
				team_id bigint(20) unsigned NULL,
				primary_player_id bigint(20) unsigned NULL,
				secondary_player_id bigint(20) unsigned NULL,
				period smallint unsigned NOT NULL DEFAULT 0,
				clock_seconds int unsigned NOT NULL DEFAULT 0,
				points int NOT NULL DEFAULT 0,
				description text NULL,
				payload_json longtext NULL,
				voided_at datetime NULL,
				voided_by bigint(20) unsigned NULL,
				void_reason text NULL,
				corrects_event_id bigint(20) unsigned NULL,
				created_by bigint(20) unsigned NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY fixture_client_event (fixture_id, client_event_id),
				UNIQUE KEY fixture_sequence (fixture_id, sequence_number),
				KEY fixture_revision (fixture_id, revision),
				KEY fixture_type_created (fixture_id, event_type, created_at),
				KEY fixture_voided (fixture_id, voided_at),
				KEY corrects_event (corrects_event_id)
			) {$collate};",
			"CREATE TABLE {$prefix}fixture_lineups (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				fixture_id bigint(20) unsigned NOT NULL,
				team_id bigint(20) unsigned NOT NULL,
				player_id bigint(20) unsigned NOT NULL,
				registration_id bigint(20) unsigned NULL,
				jersey_number smallint unsigned NULL,
				status varchar(20) NOT NULL DEFAULT 'active',
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY fixture_player_status (fixture_id, player_id, status),
				KEY fixture_team_status (fixture_id, team_id, status)
			) {$collate};",
		);
	}
}
