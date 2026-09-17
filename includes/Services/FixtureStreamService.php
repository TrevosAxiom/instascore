<?php
/**
 * Fixture livestream validation and presentation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Notifications\NotificationDispatcher;
use InstaScore\Platform\Repositories\FixtureStreamRepository;

final class FixtureStreamService {
	public function __construct( private readonly FixtureStreamRepository $repository ) {}
	public static function create(): self { global $wpdb; return new self( new FixtureStreamRepository( $wpdb ) ); }

	public function get( string $fixture_uuid, bool $public = false ): ?array {
		$row = $this->repository->for_fixture( $fixture_uuid );
		if ( $public && ( null === $row || 'private' === $row['visibility'] || ! (bool) $row['embed_enabled'] || in_array( $row['status'], array( 'draft', 'cancelled', 'failed' ), true ) ) ) { return null; }
		return null === $row ? null : $this->present( $row );
	}

	public function save( string $fixture_uuid, array $input, int $user_id ): array {
		$fixture_id = $this->repository->fixture_id( $fixture_uuid );
		if ( null === $fixture_id ) { throw new ValidationException( array( 'fixture' => 'not_found' ) ); }
		$video_id = $this->youtube_video_id( (string) ( $input['youtubeUrl'] ?? $input['videoId'] ?? '' ) );
		if ( null === $video_id ) { throw new ValidationException( array( 'youtubeUrl' => 'invalid_youtube_url' ) ); }
		$status = sanitize_key( (string) ( $input['status'] ?? 'scheduled' ) );
		if ( ! in_array( $status, array( 'draft', 'scheduled', 'testing', 'live', 'interrupted', 'ended', 'replay_processing', 'replay_available', 'cancelled', 'failed' ), true ) ) {
			throw new ValidationException( array( 'status' => 'invalid' ) );
		}
		$before = $this->repository->for_fixture( $fixture_uuid );
		$row = $this->repository->save( $fixture_id, array(
			'external_broadcast_id' => $video_id,
			'title' => sanitize_text_field( (string) ( $input['title'] ?? '' ) ),
			'status' => $status,
			'visibility' => in_array( $input['visibility'] ?? '', array( 'public', 'unlisted', 'private' ), true ) ? $input['visibility'] : 'unlisted',
			'embed_enabled' => empty( $input['embedEnabled'] ) ? 0 : 1,
			'chat_enabled' => empty( $input['chatEnabled'] ) ? 0 : 1,
			'featured' => empty( $input['featured'] ) ? 0 : 1,
			'replay_available' => in_array( $status, array( 'ended', 'replay_available' ), true ) ? 1 : 0,
			'scheduled_start' => empty( $input['scheduledStart'] ) ? null : sanitize_text_field( (string) $input['scheduledStart'] ),
			'created_by' => $user_id,
		) );
		$before_status = is_array( $before ) ? (string) $before['status'] : 'draft';
		if ( $before_status !== $status ) {
			try { NotificationDispatcher::create()->broadcast_status_changed( $fixture_uuid, $before_status, $status ); }
			catch ( \Throwable $error ) { do_action( 'instascore_log_error', $error ); }
		}
		return $this->present( $row );
	}

	public function disable( string $fixture_uuid ): ?array {
		$row = $this->repository->disable( $fixture_uuid );
		return null === $row ? null : $this->present( $row );
	}

	public function youtube_video_id( string $value ): ?string {
		$value = trim( $value );
		if ( preg_match( '/^[A-Za-z0-9_-]{11}$/', $value ) ) { return $value; }
		$url = wp_parse_url( $value );
		if ( ! is_array( $url ) || empty( $url['host'] ) ) { return null; }
		$host = strtolower( preg_replace( '/^www\./', '', (string) $url['host'] ) );
		$id = '';
		if ( 'youtu.be' === $host ) { $id = trim( (string) ( $url['path'] ?? '' ), '/' ); }
		if ( in_array( $host, array( 'youtube.com', 'm.youtube.com', 'music.youtube.com' ), true ) ) {
			$path = trim( (string) ( $url['path'] ?? '' ), '/' );
			if ( 'watch' === $path ) { parse_str( (string) ( $url['query'] ?? '' ), $query ); $id = (string) ( $query['v'] ?? '' ); }
			if ( preg_match( '#^(?:live|embed|shorts)/([A-Za-z0-9_-]{11})#', $path, $match ) ) { $id = $match[1]; }
		}
		return preg_match( '/^[A-Za-z0-9_-]{11}$/', $id ) ? $id : null;
	}

	private function present( array $row ): array {
		$id = (string) $row['external_broadcast_id'];
		return array(
			'uuid' => $row['uuid'], 'provider' => 'youtube', 'videoId' => $id,
			'watchUrl' => 'https://www.youtube.com/watch?v=' . rawurlencode( $id ),
			'embedUrl' => 'https://www.youtube-nocookie.com/embed/' . rawurlencode( $id ),
			'title' => $row['title'] ?? '', 'status' => $row['status'], 'visibility' => $row['visibility'],
			'embedEnabled' => (bool) $row['embed_enabled'], 'chatEnabled' => (bool) $row['chat_enabled'],
			'featured' => (bool) $row['featured'], 'replayAvailable' => (bool) $row['replay_available'],
			'thumbnailUrl' => $row['thumbnail_url'] ?? '',
			'scheduledStart' => $row['scheduled_start'] ?? null, 'lastSyncedAt' => $row['last_synced_at'] ?? null,
			'errorMessage' => $row['error_message'] ?? null,
		);
	}
}
