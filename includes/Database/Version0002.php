<?php
/**
 * Migration 0002: competition domain.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0002 implements Migration {
	public function __construct( private readonly wpdb $database ) {}

	public function version(): int {
		return 2;
	}

	public function name(): string {
		return 'create_competition_domain';
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
			"CREATE TABLE {$prefix}sports (
				{$shared},
				name varchar(120) NOT NULL,
				slug varchar(120) NOT NULL,
				config_json longtext NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY slug (slug),
				KEY status (status),
				KEY provider_identity (provider_name, provider_object_id)
			) {$collate};",
			"CREATE TABLE {$prefix}competitions (
				{$shared},
				sport_id bigint(20) unsigned NOT NULL,
				name varchar(160) NOT NULL,
				slug varchar(160) NOT NULL,
				competition_type varchar(20) NOT NULL,
				description text NULL,
				country_code char(2) NULL,
				rules_json longtext NULL,
				archived_at datetime NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY sport_slug (sport_id, slug),
				KEY sport_status (sport_id, status),
				KEY type_status (competition_type, status),
				KEY provider_identity (provider_name, provider_object_id)
			) {$collate};",
			"CREATE TABLE {$prefix}seasons (
				{$shared},
				competition_id bigint(20) unsigned NOT NULL,
				name varchar(120) NOT NULL,
				slug varchar(120) NOT NULL,
				start_date date NOT NULL,
				end_date date NOT NULL,
				archived_at datetime NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY competition_slug (competition_id, slug),
				KEY competition_dates (competition_id, start_date, end_date),
				KEY competition_status (competition_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}stages (
				{$shared},
				season_id bigint(20) unsigned NOT NULL,
				name varchar(120) NOT NULL,
				slug varchar(120) NOT NULL,
				stage_type varchar(30) NOT NULL DEFAULT 'league',
				sort_order int unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY season_slug (season_id, slug),
				KEY season_status (season_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}groups (
				{$shared},
				stage_id bigint(20) unsigned NOT NULL,
				name varchar(120) NOT NULL,
				slug varchar(120) NOT NULL,
				sort_order int unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				UNIQUE KEY stage_slug (stage_id, slug),
				KEY stage_status (stage_id, status)
			) {$collate};",
			"CREATE TABLE {$prefix}audit_logs (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				uuid char(36) NOT NULL,
				entity_type varchar(40) NOT NULL,
				entity_uuid char(36) NOT NULL,
				action varchar(40) NOT NULL,
				actor_user_id bigint(20) unsigned NULL,
				request_uuid char(36) NOT NULL,
				before_json longtext NULL,
				after_json longtext NULL,
				ip_hash char(64) NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY entity_history (entity_type, entity_uuid, created_at),
				KEY actor_created (actor_user_id, created_at),
				KEY request_uuid (request_uuid)
			) {$collate};",
		);
	}
}
