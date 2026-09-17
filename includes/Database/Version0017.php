<?php
/** Livestream analytics and sponsorship schema. @package InstaScore_Platform */
namespace InstaScore\Platform\Database;
use wpdb;
final class Version0017 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 17; }
	public function name(): string { return 'create_stream_analytics_and_sponsors'; }
	public function checksum(): string { return hash( 'sha256', implode( "\n", $this->schemas() ) ); }
	public function up(): void { require_once ABSPATH . 'wp-admin/includes/upgrade.php'; foreach ( $this->schemas() as $schema ) { dbDelta( $schema ); } }
	/** @return array<int,string> */
	public function schemas(): array {
		$p = $this->database->prefix . 'instascore_'; $c = $this->database->get_charset_collate();
		return array(
			"CREATE TABLE {$p}stream_view_sessions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, fixture_id bigint(20) unsigned NOT NULL,
				stream_id bigint(20) unsigned NOT NULL, session_hash char(64) NOT NULL, user_id bigint(20) unsigned NULL,
				device_category varchar(20) NOT NULL DEFAULT 'unknown', watch_seconds int unsigned NOT NULL DEFAULT 0,
				status varchar(20) NOT NULL DEFAULT 'active', started_at datetime NOT NULL, last_seen_at datetime NOT NULL, completed_at datetime NULL,
				PRIMARY KEY  (id), UNIQUE KEY stream_session (stream_id,session_hash), KEY fixture_started (fixture_id,started_at), KEY status_seen (status,last_seen_at)
			) {$c};",
			"CREATE TABLE {$p}stream_sponsors (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, competition_id bigint(20) unsigned NULL,
				fixture_id bigint(20) unsigned NULL, sponsor_name varchar(191) NOT NULL, campaign_name varchar(191) NOT NULL DEFAULT '',
				logo_url text NULL, destination_url text NULL, placement varchar(30) NOT NULL DEFAULT 'pre_match',
				starts_at datetime NULL, ends_at datetime NULL, status varchar(20) NOT NULL DEFAULT 'active', impressions bigint unsigned NOT NULL DEFAULT 0,
				clicks bigint unsigned NOT NULL DEFAULT 0, created_by bigint unsigned NULL, created_at datetime NOT NULL, updated_at datetime NOT NULL,
				PRIMARY KEY  (id), UNIQUE KEY uuid (uuid), KEY fixture_status (fixture_id,status), KEY competition_status (competition_id,status)
			) {$c};",
		);
	}
}
