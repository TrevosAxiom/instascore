<?php
/**
 * YouTube OAuth, discovery and broadcast synchronization.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Notifications\NotificationDispatcher;
use InstaScore\Platform\Repositories\FixtureStreamRepository;
use InstaScore\Platform\Support\SecretVault;

final class YouTubeLiveService {
	private const CLIENT_ID = 'instascore_youtube_client_id';
	private const CLIENT_SECRET = 'instascore_youtube_client_secret';
	private const TOKEN = 'instascore_youtube_token';
	private const CHANNEL = 'instascore_youtube_channel';

	public function __construct( private readonly FixtureStreamRepository $streams ) {}
	public static function create(): self { global $wpdb; return new self( new FixtureStreamRepository( $wpdb ) ); }

	public function settings(): array {
		$channel = get_option( self::CHANNEL, array() );
		return array(
			'clientIdConfigured' => '' !== (string) get_option( self::CLIENT_ID, '' ),
			'clientSecretConfigured' => '' !== SecretVault::decrypt( (string) get_option( self::CLIENT_SECRET, '' ) ),
			'connected' => '' !== $this->refresh_token(),
			'channel' => is_array( $channel ) && ! empty( $channel['id'] ) ? $channel : null,
			'redirectUri' => rest_url( 'instascore/v1/admin/streaming/youtube/callback' ),
			'lastSyncAt' => get_option( 'instascore_youtube_last_sync', null ),
			'lastSyncError' => get_option( 'instascore_youtube_last_sync_error', null ),
		);
	}

	public function save_credentials( array $input ): array {
		if ( ! empty( $input['clientId'] ) ) { update_option( self::CLIENT_ID, sanitize_text_field( (string) $input['clientId'] ), false ); }
		if ( ! empty( $input['clientSecret'] ) ) { update_option( self::CLIENT_SECRET, SecretVault::encrypt( trim( (string) $input['clientSecret'] ) ), false ); }
		if ( ! empty( $input['clearCredentials'] ) ) { $this->disconnect(); delete_option( self::CLIENT_ID ); delete_option( self::CLIENT_SECRET ); }
		return $this->settings();
	}

	public function authorization_url( int $user_id ): string {
		$client_id = (string) get_option( self::CLIENT_ID, '' );
		if ( '' === $client_id || '' === $this->client_secret() ) { throw new ValidationException( array( 'credentials' => 'required' ) ); }
		$state = wp_generate_password( 48, false, false );
		set_transient( $this->oauth_state_key( $state ), $user_id, 10 * MINUTE_IN_SECONDS );
		return add_query_arg( array(
			'client_id' => $client_id, 'redirect_uri' => rest_url( 'instascore/v1/admin/streaming/youtube/callback' ),
			'response_type' => 'code', 'scope' => 'https://www.googleapis.com/auth/youtube.readonly',
			'access_type' => 'offline', 'prompt' => 'consent', 'state' => $state,
		), 'https://accounts.google.com/o/oauth2/v2/auth' );
	}

	public function complete_authorization( string $state, string $code ): array {
		$key = $this->oauth_state_key( $state );
		$user_id = (int) get_transient( $key );
		delete_transient( $key );
		if ( 0 === $user_id || '' === $state || '' === $code ) {
			throw new ValidationException( array( 'oauth' => 'invalid_or_expired_state' ) );
		}
		$token = $this->token_request( array(
			'code' => $code, 'client_id' => (string) get_option( self::CLIENT_ID, '' ), 'client_secret' => $this->client_secret(),
			'redirect_uri' => rest_url( 'instascore/v1/admin/streaming/youtube/callback' ), 'grant_type' => 'authorization_code',
		) );
		$this->save_token( $token );
		$channel = $this->fetch_channel();
		update_option( self::CHANNEL, $channel, false );
		return $this->settings();
	}

	public function disconnect(): void {
		delete_option( self::TOKEN ); delete_option( self::CHANNEL ); delete_option( 'instascore_youtube_last_sync' );
	}

	public function broadcasts(): array {
		$data = $this->api_get( 'https://www.googleapis.com/youtube/v3/liveBroadcasts', array(
			'part' => 'id,snippet,status,contentDetails', 'mine' => 'true', 'broadcastStatus' => 'all', 'maxResults' => 50,
		) );
		$items = (array) ( $data['items'] ?? array() );
		$ids = array_values( array_filter( array_map( static fn( array $item ): string => (string) ( $item['id'] ?? '' ), $items ) ) );
		$details = array();
		if ( array() !== $ids ) {
			try {
				$video_data = $this->api_get( 'https://www.googleapis.com/youtube/v3/videos', array( 'part' => 'liveStreamingDetails,statistics', 'id' => implode( ',', $ids ), 'maxResults' => 50 ) );
				foreach ( (array) ( $video_data['items'] ?? array() ) as $video ) { $details[ (string) ( $video['id'] ?? '' ) ] = $video; }
			} catch ( \Throwable $error ) {
				do_action( 'instascore_log_error', $error );
			}
		}
		return array_map( fn( array $item ): array => $this->present_broadcast( $item, $details[ (string) ( $item['id'] ?? '' ) ] ?? array() ), $items );
	}

	public function synchronize(): array {
		try {
			$broadcasts = array_column( $this->broadcasts(), null, 'videoId' );
		} catch ( \Throwable $error ) {
			$this->streams->mark_youtube_sync_failure( $error->getMessage() );
			update_option( 'instascore_youtube_last_sync_error', sanitize_text_field( $error->getMessage() ), false );
			throw $error;
		}
		$updated = 0;
		foreach ( $this->streams->youtube_streams_for_sync() as $stream ) {
			$id = (string) $stream['external_broadcast_id'];
			if ( ! isset( $broadcasts[ $id ] ) ) { continue; }
			$this->streams->synchronize_youtube( (int) $stream['id'], $broadcasts[ $id ] );
			$this->notify_status_change( (string) ( $stream['fixture_uuid'] ?? '' ), (string) $stream['status'], (string) $broadcasts[ $id ]['status'] );
			++$updated;
		}
		$auto = $this->auto_match_broadcasts( array_values( $broadcasts ) );
		$now = gmdate( 'Y-m-d H:i:s' ); update_option( 'instascore_youtube_last_sync', $now, false ); delete_option( 'instascore_youtube_last_sync_error' );
		return array( 'broadcastsFound' => count( $broadcasts ), 'streamsUpdated' => $updated, 'autoMatched' => count( $auto ), 'syncedAt' => $now );
	}

	public function control_room(): array {
		$broadcasts = $this->broadcasts();
		$assigned   = $this->streams->assigned_youtube_video_ids();
		$fixtures   = $this->streams->fixture_candidates_for_youtube();
		$queue      = array();
		foreach ( $broadcasts as $broadcast ) {
			if ( in_array( $broadcast['videoId'], $assigned, true ) || in_array( $broadcast['status'], array( 'failed', 'replay_available' ), true ) ) { continue; }
			$suggestions = $this->fixture_suggestions( $broadcast, $fixtures );
			$queue[] = array( 'broadcast' => $broadcast, 'suggestions' => $suggestions, 'recommended' => $suggestions[0] ?? null );
		}
		$health = $this->health();
		$settings = $this->settings();
		$last_sync = empty( $settings['lastSyncAt'] ) ? null : strtotime( (string) $settings['lastSyncAt'] . ' UTC' );
		$checks = array(
			array( 'key' => 'channel', 'label' => 'YouTube channel connected', 'ready' => (bool) $settings['connected'], 'guidance' => 'Connect the official league YouTube channel in Settings.' ),
			array( 'key' => 'scheduler', 'label' => 'Automatic polling scheduled', 'ready' => false !== wp_get_scheduled_event( 'instascore_youtube_stream_sync' ), 'guidance' => 'Restore the WordPress cron event or server cron runner.' ),
			array( 'key' => 'sync', 'label' => 'Channel synchronized recently', 'ready' => null !== $last_sync && time() - $last_sync <= 5 * MINUTE_IN_SECONDS, 'guidance' => 'Run Sync channel and verify API access before kickoff.' ),
			array( 'key' => 'health', 'label' => 'Attached streams healthy', 'ready' => 0 === (int) $health['failed'] && 0 === (int) $health['stale'], 'guidance' => 'Check Veo connectivity and YouTube Live Control Room.' ),
			array( 'key' => 'assignment', 'label' => 'No broadcasts awaiting review', 'ready' => 0 === count( $queue ), 'guidance' => 'Approve a fixture suggestion or correct the broadcast title and schedule.' ),
		);
		return array( 'health' => $health, 'readiness' => array( 'ready' => ! in_array( false, array_column( $checks, 'ready' ), true ), 'checks' => $checks ), 'reviewQueue' => $queue, 'broadcasts' => $broadcasts, 'refreshedAt' => gmdate( 'c' ) );
	}

	public function attach( string $fixture_uuid, string $video_id, int $user_id ): array {
		$broadcast = null;
		foreach ( $this->broadcasts() as $item ) { if ( $video_id === $item['videoId'] ) { $broadcast = $item; break; } }
		if ( null === $broadcast ) { throw new ValidationException( array( 'broadcast' => 'not_found' ) ); }
		return FixtureStreamService::create()->save( $fixture_uuid, $this->stream_input( $broadcast ), $user_id );
	}

	public function auto_match(): array { return $this->auto_match_broadcasts( $this->broadcasts() ); }

	/** @return array<int,array<string,mixed>> */
	public function fixture_suggestions( array $broadcast, array $fixtures ): array {
		$title = $this->normalize_match_text( (string) ( $broadcast['title'] ?? '' ) );
		$start = empty( $broadcast['scheduledStart'] ) ? null : strtotime( (string) $broadcast['scheduledStart'] );
		$ranked = array();
		foreach ( $fixtures as $fixture ) {
			if ( ! empty( $fixture['external_broadcast_id'] ) && $fixture['external_broadcast_id'] !== ( $broadcast['videoId'] ?? '' ) ) { continue; }
			$home = $this->normalize_match_text( (string) $fixture['home_team_name'] );
			$away = $this->normalize_match_text( (string) $fixture['away_team_name'] );
			$competition = $this->normalize_match_text( (string) $fixture['competition_name'] );
			$home_match = '' !== $home && str_contains( $title, $home );
			$away_match = '' !== $away && str_contains( $title, $away );
			$score = ( $home_match ? 35 : 0 ) + ( $away_match ? 35 : 0 ) + ( '' !== $competition && str_contains( $title, $competition ) ? 10 : 0 );
			$fixture_start = strtotime( (string) $fixture['kickoff_at'] . ' UTC' );
			$minutes = null !== $start && false !== $fixture_start ? (int) round( abs( $start - $fixture_start ) / 60 ) : null;
			if ( null !== $minutes ) { $score += $minutes <= 15 ? 25 : ( $minutes <= 60 ? 15 : ( $minutes <= 180 ? 5 : 0 ) ); }
			if ( 0 === $score ) { continue; }
			$safe_to_automate = $home_match && $away_match && null !== $minutes && $minutes <= 60;
			$ranked[] = array(
				'fixtureUuid' => $fixture['uuid'], 'fixtureName' => $fixture['home_team_name'] . ' vs ' . $fixture['away_team_name'],
				'competitionName' => $fixture['competition_name'], 'kickoffAt' => $fixture['kickoff_at'], 'score' => min( 100, $score ),
				'confidence' => $safe_to_automate && $score >= 85 ? 'high' : ( $score >= 55 ? 'medium' : 'low' ),
				'reasons' => array_values( array_filter( array( $home_match && $away_match ? 'Both team names match' : ( $home_match || $away_match ? 'One team name matches' : null ), null !== $minutes ? $minutes . ' minutes from scheduled kickoff' : null ) ) ),
			);
		}
		usort( $ranked, static fn( array $a, array $b ): int => $b['score'] <=> $a['score'] );
		return array_slice( $ranked, 0, 3 );
	}

	private function auto_match_broadcasts( array $broadcasts ): array {
		$fixtures = $this->streams->fixture_candidates_for_youtube();
		$assigned = $this->streams->assigned_youtube_video_ids();
		$used_fixtures = array_values( array_filter( array_map( static fn( array $fixture ): ?string => empty( $fixture['external_broadcast_id'] ) ? null : (string) $fixture['uuid'], $fixtures ) ) );
		$matches = array();
		foreach ( $broadcasts as $broadcast ) {
			if ( in_array( $broadcast['videoId'], $assigned, true ) || ! in_array( $broadcast['status'], array( 'scheduled', 'testing', 'live' ), true ) ) { continue; }
			$suggestion = $this->fixture_suggestions( $broadcast, $fixtures )[0] ?? null;
			if ( ! is_array( $suggestion ) || 'high' !== $suggestion['confidence'] ) { continue; }
			if ( in_array( $suggestion['fixtureUuid'], $used_fixtures, true ) ) { continue; }
			$fixture_id = $this->streams->fixture_id( $suggestion['fixtureUuid'] );
			if ( null === $fixture_id ) { continue; }
			$this->streams->save( $fixture_id, array_merge( $this->storage_values( $broadcast ), array( 'created_by' => 0 ) ) );
			$matches[] = array( 'videoId' => $broadcast['videoId'], 'fixtureUuid' => $suggestion['fixtureUuid'], 'score' => $suggestion['score'] );
			$assigned[] = $broadcast['videoId'];
			$used_fixtures[] = $suggestion['fixtureUuid'];
		}
		return $matches;
	}

	private function stream_input( array $broadcast ): array {
		return array( 'videoId' => $broadcast['videoId'], 'title' => $broadcast['title'], 'status' => $broadcast['status'], 'visibility' => $broadcast['visibility'], 'embedEnabled' => $broadcast['embedEnabled'], 'chatEnabled' => false, 'featured' => false, 'scheduledStart' => $broadcast['scheduledStart'] );
	}

	private function storage_values( array $broadcast ): array {
		return array(
			'external_broadcast_id' => $broadcast['videoId'], 'title' => sanitize_text_field( $broadcast['title'] ), 'status' => sanitize_key( $broadcast['status'] ),
			'visibility' => sanitize_key( $broadcast['visibility'] ), 'embed_enabled' => empty( $broadcast['embedEnabled'] ) ? 0 : 1, 'chat_enabled' => 0,
			'featured' => 0, 'replay_available' => 0, 'thumbnail_url' => esc_url_raw( (string) $broadcast['thumbnailUrl'] ),
			'scheduled_start' => empty( $broadcast['scheduledStart'] ) ? null : gmdate( 'Y-m-d H:i:s', strtotime( $broadcast['scheduledStart'] ) ),
		);
	}

	private function normalize_match_text( string $value ): string {
		$value = strtolower( remove_accents( $value ) );
		return trim( preg_replace( '/[^a-z0-9]+/', ' ', $value ) ?? '' );
	}

	private function notify_status_change( string $fixture_uuid, string $before, string $after ): void {
		if ( '' === $fixture_uuid || $before === $after ) { return; }
		try { NotificationDispatcher::create()->broadcast_status_changed( $fixture_uuid, $before, $after ); }
		catch ( \Throwable $error ) { do_action( 'instascore_log_error', $error ); }
	}

	public function health(): array {
		$rows = $this->streams->youtube_health_rows();
		$now = time();
		$items = array_map(
			static function ( array $row ) use ( $now ): array {
				$last_sync = empty( $row['last_synced_at'] ) ? null : strtotime( (string) $row['last_synced_at'] . ' UTC' );
				$active = in_array( $row['status'], array( 'scheduled', 'testing', 'live', 'interrupted', 'replay_processing' ), true );
				return array(
					'fixtureUuid' => $row['fixture_uuid'], 'fixtureName' => $row['home_team_name'] . ' vs ' . $row['away_team_name'],
					'videoId' => $row['external_broadcast_id'], 'status' => $row['status'],
					'lastSyncedAt' => $row['last_synced_at'], 'stale' => $active && ( null === $last_sync || $now - $last_sync > 5 * MINUTE_IN_SECONDS ),
					'errorMessage' => $row['error_message'] ?? null,
				);
			},
			$rows
		);
		return array(
			'connected' => $this->settings()['connected'], 'total' => count( $items ),
			'live' => count( array_filter( $items, fn( array $item ): bool => 'live' === $item['status'] ) ),
			'failed' => count( array_filter( $items, fn( array $item ): bool => 'failed' === $item['status'] || null !== $item['errorMessage'] ) ),
			'stale' => count( array_filter( $items, fn( array $item ): bool => $item['stale'] ) ), 'items' => $items,
		);
	}

	private function fetch_channel(): array {
		$data = $this->api_get( 'https://www.googleapis.com/youtube/v3/channels', array( 'part' => 'id,snippet', 'mine' => 'true' ) );
		$item = $data['items'][0] ?? null;
		if ( ! is_array( $item ) ) { throw new \RuntimeException( 'The authorized YouTube channel could not be found.' ); }
		return array( 'id' => $item['id'], 'name' => $item['snippet']['title'] ?? '', 'thumbnailUrl' => $item['snippet']['thumbnails']['default']['url'] ?? '' );
	}

	private function present_broadcast( array $item, array $video = array() ): array {
		$life = (string) ( $item['status']['lifeCycleStatus'] ?? 'created' );
		$status = match ( $life ) {
			'live', 'liveStarting' => 'live',
			'testing', 'testStarting' => 'testing',
			'complete' => 'recorded' === ( $item['status']['recordingStatus'] ?? '' ) ? 'replay_available' : 'replay_processing',
			'revoked' => 'failed',
			default => 'scheduled',
		};
		$snippet = (array) ( $item['snippet'] ?? array() );
		return array(
			'videoId' => (string) ( $item['id'] ?? '' ), 'title' => (string) ( $snippet['title'] ?? '' ), 'status' => $status,
			'visibility' => (string) ( $item['status']['privacyStatus'] ?? 'unlisted' ),
			'scheduledStart' => $snippet['scheduledStartTime'] ?? null, 'actualStart' => $snippet['actualStartTime'] ?? null,
			'actualEnd' => $snippet['actualEndTime'] ?? null, 'thumbnailUrl' => $snippet['thumbnails']['medium']['url'] ?? '',
			'embedEnabled' => (bool) ( $item['contentDetails']['enableEmbed'] ?? true ),
			'concurrentViewers' => isset( $video['liveStreamingDetails']['concurrentViewers'] ) ? (int) $video['liveStreamingDetails']['concurrentViewers'] : null,
			'viewCount' => isset( $video['statistics']['viewCount'] ) ? (int) $video['statistics']['viewCount'] : null,
		);
	}

	private function api_get( string $url, array $query ): array {
		$response = wp_remote_get( add_query_arg( $query, $url ), array( 'timeout' => 20, 'headers' => array( 'Authorization' => 'Bearer ' . $this->access_token() ) ) );
		return $this->decode_response( $response );
	}

	private function access_token(): string {
		$token = $this->token_data();
		if ( ! empty( $token['access_token'] ) && (int) ( $token['expires_at'] ?? 0 ) > time() + 60 ) { return (string) $token['access_token']; }
		$refresh = (string) ( $token['refresh_token'] ?? '' );
		if ( '' === $refresh ) { throw new \RuntimeException( 'YouTube is not connected.' ); }
		$fresh = $this->token_request( array( 'client_id' => (string) get_option( self::CLIENT_ID, '' ), 'client_secret' => $this->client_secret(), 'refresh_token' => $refresh, 'grant_type' => 'refresh_token' ) );
		$fresh['refresh_token'] = $refresh; $this->save_token( $fresh ); return (string) $fresh['access_token'];
	}

	private function token_request( array $body ): array {
		$response = wp_remote_post( 'https://oauth2.googleapis.com/token', array( 'timeout' => 20, 'body' => $body ) );
		return $this->decode_response( $response );
	}

	private function decode_response( mixed $response ): array {
		if ( is_wp_error( $response ) ) { throw new \RuntimeException( $response->get_error_message() ); }
		$code = wp_remote_retrieve_response_code( $response ); $data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $code < 200 || $code >= 300 || ! is_array( $data ) ) { throw new \RuntimeException( (string) ( $data['error']['message'] ?? $data['error_description'] ?? 'YouTube request failed.' ) ); }
		return $data;
	}

	private function save_token( array $token ): void {
		$existing = $this->token_data();
		$token['refresh_token'] = $token['refresh_token'] ?? $existing['refresh_token'] ?? '';
		$token['expires_at'] = time() + max( 60, (int) ( $token['expires_in'] ?? 3600 ) );
		update_option( self::TOKEN, SecretVault::encrypt( wp_json_encode( $token ) ), false );
	}
	private function token_data(): array { $json = SecretVault::decrypt( (string) get_option( self::TOKEN, '' ) ); $data = json_decode( $json, true ); return is_array( $data ) ? $data : array(); }
	private function refresh_token(): string { return (string) ( $this->token_data()['refresh_token'] ?? '' ); }
	private function client_secret(): string { return SecretVault::decrypt( (string) get_option( self::CLIENT_SECRET, '' ) ); }
	private function oauth_state_key( string $state ): string { return 'instascore_youtube_oauth_' . substr( hash( 'sha256', $state ), 0, 40 ); }
}
