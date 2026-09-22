<?php
/** Generic room scoping for fixture and fantasy banter. @package InstaScore_Platform */
namespace InstaScore\Platform\Database;
use wpdb;
final class Version0023 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 23; }
	public function name(): string { return 'add_fantasy_banter_rooms'; }
	public function checksum(): string { return hash( 'sha256', implode( "\n", $this->queries() ) ); }
	public function up(): void { foreach ( $this->queries() as $query ) { $this->database->query( $query ); } }
	private function queries(): array { $p = $this->database->prefix . 'instascore_'; return array(
		"ALTER TABLE {$p}chat_messages ADD COLUMN room_type varchar(20) NOT NULL DEFAULT 'fixture' AFTER fixture_id",
		"ALTER TABLE {$p}chat_messages ADD COLUMN room_id bigint(20) unsigned NOT NULL DEFAULT 0 AFTER room_type",
		"UPDATE {$p}chat_messages SET room_id=fixture_id WHERE room_id=0",
		"ALTER TABLE {$p}chat_messages ADD KEY room_status_id (room_type,room_id,status,id)",
		"ALTER TABLE {$p}chat_bans ADD COLUMN room_type varchar(20) NOT NULL DEFAULT 'fixture' AFTER fixture_id",
		"ALTER TABLE {$p}chat_bans ADD COLUMN room_id bigint(20) unsigned NOT NULL DEFAULT 0 AFTER room_type",
		"UPDATE {$p}chat_bans SET room_id=COALESCE(fixture_id,0) WHERE room_id=0",
		"ALTER TABLE {$p}chat_bans ADD KEY room_user (room_type,room_id,user_id)",
	); }
}
