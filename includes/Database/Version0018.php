<?php
/** Fixture chat, reactions and moderation. @package InstaScore_Platform */
namespace InstaScore\Platform\Database;
use wpdb;
final class Version0018 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 18; }
	public function name(): string { return 'create_fixture_banter'; }
	public function checksum(): string { return hash( 'sha256', implode( "\n", $this->schemas() ) ); }
	public function up(): void { require_once ABSPATH . 'wp-admin/includes/upgrade.php'; foreach ( $this->schemas() as $schema ) { dbDelta( $schema ); } }
	/** @return array<int,string> */
	public function schemas(): array { $p = $this->database->prefix . 'instascore_'; $c = $this->database->get_charset_collate(); return array(
		"CREATE TABLE {$p}chat_messages (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, fixture_id bigint(20) unsigned NOT NULL,
			user_id bigint(20) unsigned NOT NULL, user_uuid char(36) NOT NULL, display_name varchar(191) NOT NULL,
			parent_id bigint(20) unsigned NULL, body varchar(500) NOT NULL, status varchar(20) NOT NULL DEFAULT 'active',
			report_count int unsigned NOT NULL DEFAULT 0, created_at datetime NOT NULL, updated_at datetime NOT NULL,
			PRIMARY KEY  (id), UNIQUE KEY uuid (uuid), KEY fixture_status_id (fixture_id,status,id), KEY user_fixture (user_id,fixture_id)
		) {$c};",
		"CREATE TABLE {$p}chat_reactions (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, message_id bigint(20) unsigned NOT NULL, user_id bigint(20) unsigned NOT NULL,
			reaction varchar(20) NOT NULL, created_at datetime NOT NULL, PRIMARY KEY  (id), UNIQUE KEY message_user_reaction (message_id,user_id,reaction), KEY message_id (message_id)
		) {$c};",
		"CREATE TABLE {$p}chat_reports (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, message_id bigint(20) unsigned NOT NULL,
			reporter_user_id bigint(20) unsigned NOT NULL, reason varchar(191) NOT NULL, status varchar(20) NOT NULL DEFAULT 'open', created_at datetime NOT NULL,
			PRIMARY KEY  (id), UNIQUE KEY uuid (uuid), UNIQUE KEY message_reporter (message_id,reporter_user_id), KEY status_created (status,created_at)
		) {$c};",
		"CREATE TABLE {$p}chat_bans (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, fixture_id bigint(20) unsigned NULL,
			user_id bigint(20) unsigned NOT NULL, reason varchar(191) NOT NULL, status varchar(20) NOT NULL DEFAULT 'active',
			expires_at datetime NULL, created_by bigint(20) unsigned NOT NULL, created_at datetime NOT NULL, updated_at datetime NOT NULL,
			PRIMARY KEY  (id), UNIQUE KEY uuid (uuid), KEY user_status_expiry (user_id,status,expires_at), KEY fixture_user (fixture_id,user_id)
		) {$c};",
	); }
}
