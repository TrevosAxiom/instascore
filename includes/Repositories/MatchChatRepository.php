<?php
/** Match chat persistence. @package InstaScore_Platform */
namespace InstaScore\Platform\Repositories;
use wpdb;
final class MatchChatRepository {
	private readonly string $prefix;
	public function __construct( private readonly wpdb $database ) { $this->prefix = $database->prefix . 'instascore_'; }
	public function fixture_id( string $uuid ): ?int { $value = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$this->prefix}fixtures WHERE uuid=%s LIMIT 1", $uuid ) ); return null === $value ? null : (int) $value; }
	public function fantasy_game_id( string $uuid ): ?int { $value = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$this->prefix}fantasy_games WHERE uuid=%s LIMIT 1", $uuid ) ); return null === $value ? null : (int) $value; }
	/** @return array<int,array<string,mixed>> */
	public function messages( int $fixture_id, int $viewer_id, int $limit = 75 ): array {
		return $this->room_messages( 'fixture', $fixture_id, $viewer_id, $limit );
	}
	public function room_messages( string $room_type, int $room_id, int $viewer_id, int $limit = 75 ): array {
		$rows = $this->database->get_results( $this->database->prepare( "SELECT m.*,p.uuid parent_uuid,p.display_name parent_display_name FROM {$this->prefix}chat_messages m LEFT JOIN {$this->prefix}chat_messages p ON p.id=m.parent_id WHERE m.room_type=%s AND m.room_id=%d AND m.status='active' ORDER BY m.id DESC LIMIT %d", $room_type, $room_id, $limit ), ARRAY_A );
		$rows = array_reverse( is_array( $rows ) ? $rows : array() ); if ( array() === $rows ) { return array(); }
		$ids = array_map( static fn( array $row ): int => (int) $row['id'], $rows ); $placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$reactions = $this->database->get_results( $this->database->prepare( "SELECT message_id,reaction,COUNT(*) total,MAX(CASE WHEN user_id=%d THEN 1 ELSE 0 END) reacted FROM {$this->prefix}chat_reactions WHERE message_id IN ({$placeholders}) GROUP BY message_id,reaction", array_merge( array( $viewer_id ), $ids ) ), ARRAY_A );
		$indexed = array(); foreach ( is_array( $reactions ) ? $reactions : array() as $reaction ) { $indexed[ (int) $reaction['message_id'] ][] = $reaction; }
		foreach ( $rows as &$row ) { $row['reactions'] = $indexed[ (int) $row['id'] ] ?? array(); } unset( $row ); return $rows;
	}
	public function message( string $uuid ): ?array { $row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->prefix}chat_messages WHERE uuid=%s LIMIT 1", $uuid ), ARRAY_A ); return is_array( $row ) ? $row : null; }
	public function create( array $values ): array { $row = array_merge( $values, array( 'uuid' => wp_generate_uuid4(), 'status' => 'active', 'report_count' => 0, 'created_at' => gmdate( 'Y-m-d H:i:s' ), 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ) ); $this->database->insert( $this->prefix . 'chat_messages', $row ); $row['id'] = (int) $this->database->insert_id; $row['reactions'] = array(); return $row; }
	public function parent_id( string $uuid, int $fixture_id ): ?int { $row = $this->message( $uuid ); return is_array( $row ) && (int) $row['fixture_id'] === $fixture_id ? (int) $row['id'] : null; }
	public function room_parent_id( string $uuid, string $room_type, int $room_id ): ?int { $row = $this->message( $uuid ); return is_array( $row ) && ( $row['room_type'] ?? 'fixture' ) === $room_type && (int) ( $row['room_id'] ?? $row['fixture_id'] ) === $room_id ? (int) $row['id'] : null; }
	public function banned( int $user_id, int $fixture_id ): bool { return (bool) $this->database->get_var( $this->database->prepare( "SELECT COUNT(*) FROM {$this->prefix}chat_bans WHERE user_id=%d AND status='active' AND (fixture_id IS NULL OR fixture_id=%d) AND (expires_at IS NULL OR expires_at>%s)", $user_id, $fixture_id, gmdate( 'Y-m-d H:i:s' ) ) ); }
	public function room_banned( int $user_id, string $room_type, int $room_id ): bool { return (bool) $this->database->get_var( $this->database->prepare( "SELECT COUNT(*) FROM {$this->prefix}chat_bans WHERE user_id=%d AND status='active' AND room_type=%s AND (room_id=0 OR room_id=%d) AND (expires_at IS NULL OR expires_at>%s)", $user_id, $room_type, $room_id, gmdate( 'Y-m-d H:i:s' ) ) ); }
	public function toggle_reaction( int $message_id, int $user_id, string $reaction ): void { $table = $this->prefix . 'chat_reactions'; $existing = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$table} WHERE message_id=%d AND user_id=%d AND reaction=%s", $message_id, $user_id, $reaction ) ); if ( null !== $existing ) { $this->database->delete( $table, array( 'id' => (int) $existing ) ); } else { $this->database->insert( $table, array( 'message_id' => $message_id, 'user_id' => $user_id, 'reaction' => $reaction, 'created_at' => gmdate( 'Y-m-d H:i:s' ) ) ); } }
	public function report( int $message_id, int $user_id, string $reason ): int { $this->database->replace( $this->prefix . 'chat_reports', array( 'uuid' => wp_generate_uuid4(), 'message_id' => $message_id, 'reporter_user_id' => $user_id, 'reason' => $reason, 'status' => 'open', 'created_at' => gmdate( 'Y-m-d H:i:s' ) ) ); $this->database->query( $this->database->prepare( "UPDATE {$this->prefix}chat_messages SET report_count=report_count+1 WHERE id=%d", $message_id ) ); return (int) $this->database->get_var( $this->database->prepare( "SELECT COUNT(DISTINCT reporter_user_id) FROM {$this->prefix}chat_reports WHERE message_id=%d AND status='open'", $message_id ) ); }
	public function moderate( int $message_id ): void { $this->database->update( $this->prefix . 'chat_messages', array( 'status' => 'moderated', 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'id' => $message_id ) ); $this->database->update( $this->prefix . 'chat_reports', array( 'status' => 'resolved' ), array( 'message_id' => $message_id ) ); }
	public function hold_for_review( int $message_id ): void { $this->database->update( $this->prefix . 'chat_messages', array( 'status' => 'under_review', 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'id' => $message_id ) ); }
	public function ban( int $fixture_id, int $user_id, int $moderator_id, string $reason, ?string $expires_at ): void { $this->database->insert( $this->prefix . 'chat_bans', array( 'uuid' => wp_generate_uuid4(), 'fixture_id' => $fixture_id, 'user_id' => $user_id, 'reason' => $reason, 'status' => 'active', 'expires_at' => $expires_at, 'created_by' => $moderator_id, 'created_at' => gmdate( 'Y-m-d H:i:s' ), 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ) ); }
}
