<?php
/** Match banter validation, presentation and moderation. @package InstaScore_Platform */
namespace InstaScore\Platform\Services;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\MatchChatRepository;
use InstaScore\Platform\Support\UserIdentity;
final class MatchChatService {
	public function __construct( private readonly MatchChatRepository $repository ) {}
	public static function create(): self { global $wpdb; return new self( new MatchChatRepository( $wpdb ) ); }
	public function room( string $fixture_uuid, int $viewer_id ): array { $fixture_id = $this->fixture_id( $fixture_uuid ); return array( 'messages' => array_map( array( $this, 'present' ), $this->repository->messages( $fixture_id, $viewer_id ) ), 'banned' => $viewer_id > 0 && $this->repository->banned( $viewer_id, $fixture_id ) ); }
	public function post( string $fixture_uuid, array $input, int $user_id ): array {
		$fixture_id = $this->fixture_id( $fixture_uuid ); if ( $this->repository->banned( $user_id, $fixture_id ) ) { throw new ValidationException( array( 'chat' => 'banned' ) ); }
		$body = trim( sanitize_textarea_field( (string) ( $input['body'] ?? '' ) ) );
		if ( '' === $body || mb_strlen( $body ) > 280 ) { throw new ValidationException( array( 'body' => 'Use between 1 and 280 characters.' ) ); }
		$this->enforce_rate_limit( $fixture_uuid, $user_id );
		$parent_id = empty( $input['parentUuid'] ) ? null : $this->repository->parent_id( sanitize_text_field( (string) $input['parentUuid'] ), $fixture_id );
		$user = wp_get_current_user();
		return $this->present( $this->repository->create( array( 'fixture_id' => $fixture_id, 'user_id' => $user_id, 'user_uuid' => UserIdentity::uuid( $user_id ), 'display_name' => sanitize_text_field( (string) $user->display_name ), 'parent_id' => $parent_id, 'body' => $body ) ) );
	}
	public function react( string $message_uuid, string $reaction, int $user_id ): array { if ( ! in_array( $reaction, array( '🔥', '😂', '👏', '❤️' ), true ) ) { throw new ValidationException( array( 'reaction' => 'invalid' ) ); } $message = $this->message( $message_uuid ); $this->repository->toggle_reaction( (int) $message['id'], $user_id, $reaction ); return array( 'updated' => true ); }
	public function report( string $message_uuid, string $reason, int $user_id ): array { $message = $this->message( $message_uuid ); if ( (int) $message['user_id'] === $user_id ) { throw new ValidationException( array( 'message' => 'cannot_report_own_message' ) ); } $this->repository->report( (int) $message['id'], $user_id, sanitize_text_field( $reason ?: 'Inappropriate content' ) ); return array( 'reported' => true ); }
	public function moderate( string $message_uuid ): array { $message = $this->message( $message_uuid ); $this->repository->moderate( (int) $message['id'] ); return array( 'moderated' => true ); }
	public function ban_author( string $fixture_uuid, string $message_uuid, int $moderator_id, array $input ): array { $fixture_id = $this->fixture_id( $fixture_uuid ); $message = $this->message( $message_uuid ); $hours = min( 720, max( 1, (int) ( $input['hours'] ?? 24 ) ) ); $this->repository->ban( $fixture_id, (int) $message['user_id'], $moderator_id, sanitize_text_field( (string) ( $input['reason'] ?? 'Match chat moderation' ) ), gmdate( 'Y-m-d H:i:s', time() + $hours * HOUR_IN_SECONDS ) ); $this->repository->moderate( (int) $message['id'] ); return array( 'banned' => true, 'hours' => $hours ); }
	private function fixture_id( string $uuid ): int { $id = $this->repository->fixture_id( $uuid ); if ( null === $id ) { throw new ValidationException( array( 'fixture' => 'not_found' ) ); } return $id; }
	private function message( string $uuid ): array { $row = $this->repository->message( $uuid ); if ( null === $row || 'active' !== $row['status'] ) { throw new ValidationException( array( 'message' => 'not_found' ) ); } return $row; }
	private function enforce_rate_limit( string $fixture_uuid, int $user_id ): void { $key = 'instascore_chat_rate_' . $user_id . '_' . substr( hash( 'sha256', $fixture_uuid ), 0, 12 ); $now = time(); $values = get_transient( $key ); $values = array_values( array_filter( is_array( $values ) ? $values : array(), static fn( int $time ): bool => $time > $now - 30 ) ); if ( count( $values ) >= 5 ) { throw new ValidationException( array( 'chat' => 'Please slow down before posting again.' ) ); } $values[] = $now; set_transient( $key, $values, 30 ); }
	private function present( array $row ): array { return array( 'uuid' => $row['uuid'], 'body' => $row['body'], 'author' => array( 'uuid' => $row['user_uuid'], 'displayName' => $row['display_name'] ), 'parent' => empty( $row['parent_uuid'] ) ? null : array( 'uuid' => $row['parent_uuid'], 'displayName' => $row['parent_display_name'] ?? '' ), 'reactions' => array_map( static fn( array $item ): array => array( 'reaction' => $item['reaction'], 'count' => (int) $item['total'], 'reacted' => (bool) $item['reacted'] ), $row['reactions'] ?? array() ), 'reportCount' => (int) ( $row['report_count'] ?? 0 ), 'createdAt' => $row['created_at'] ); }
}
