<?php
/**
 * External provider mapping and sync storage.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class ProviderRepository extends BaseRepository {
	public function __construct( \wpdb $database ) {
		parent::__construct( $database, 'provider_mappings' );
	}

	/**
	 * @param array<string,mixed> $entity Normalised entity.
	 */
	public function upsert_mapping( string $provider, string $sport, string $entity_type, array $entity, ?string $internal_uuid = null, bool $dry_run = false ): array {
		$row = array(
			'uuid'               => wp_generate_uuid4(),
			'provider_name'      => $provider,
			'sport_slug'         => $sport,
			'entity_type'        => $entity_type,
			'provider_object_id' => sanitize_text_field( (string) ( $entity['providerId'] ?? '' ) ),
			'internal_uuid'      => $internal_uuid,
			'internal_table'     => $entity_type,
			'display_name'       => sanitize_text_field( (string) ( $entity['name'] ?? $entity['providerId'] ?? '' ) ),
			'status'             => '' === (string) ( $entity['providerId'] ?? '' ) ? 'conflict' : 'mapped',
			'conflict_reason'    => '' === (string) ( $entity['providerId'] ?? '' ) ? 'Missing provider ID.' : null,
			'raw_hash'           => hash( 'sha256', wp_json_encode( $entity ) ?: '' ),
			'last_seen_at'       => gmdate( 'Y-m-d H:i:s' ),
			'created_at'         => gmdate( 'Y-m-d H:i:s' ),
			'updated_at'         => gmdate( 'Y-m-d H:i:s' ),
		);

		if ( ! $dry_run ) {
			$this->database->replace(
				$this->database->prefix . 'instascore_provider_mappings',
				$row,
				array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
			);
		}

		return $row;
	}

	/**
	 * @param array<string,mixed> $data Sync log payload.
	 */
	public function record_sync_log( array $data ): array {
		$row = array(
			'uuid'                 => wp_generate_uuid4(),
			'provider_name'        => sanitize_key( (string) $data['provider'] ),
			'sync_type'            => sanitize_key( (string) $data['syncType'] ),
			'dry_run'              => empty( $data['dryRun'] ) ? 0 : 1,
			'status'               => sanitize_key( (string) $data['status'] ),
			'request_hash'         => hash( 'sha256', wp_json_encode( $data['filters'] ?? array() ) ?: '' ),
			'filters_json'         => wp_json_encode( $data['filters'] ?? array() ) ?: '{}',
			'preview_json'         => wp_json_encode( $data['preview'] ?? array() ) ?: '[]',
			'rate_limit_remaining' => isset( $data['rateLimitRemaining'] ) ? (int) $data['rateLimitRemaining'] : null,
			'rate_limit_reset_at'  => $data['rateLimitResetAt'] ?? null,
			'retry_after_seconds'  => isset( $data['retryAfterSeconds'] ) ? (int) $data['retryAfterSeconds'] : null,
			'attempt_count'        => (int) ( $data['attemptCount'] ?? 1 ),
			'error_code'           => $data['errorCode'] ?? null,
			'error_message'        => $data['errorMessage'] ?? null,
			'last_known_at'        => gmdate( 'Y-m-d H:i:s' ),
			'started_at'           => $data['startedAt'] ?? gmdate( 'Y-m-d H:i:s' ),
			'finished_at'          => gmdate( 'Y-m-d H:i:s' ),
			'created_at'           => gmdate( 'Y-m-d H:i:s' ),
		);

		$this->database->insert(
			$this->database->prefix . 'instascore_provider_sync_logs',
			$row,
			array( '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		return $row;
	}

	/** @param array<int,array<string,mixed>> $payload */
	public function store_snapshot( string $provider, string $sport, string $sync_type, array $payload ): void {
		$this->database->replace(
			$this->database->prefix . 'instascore_provider_snapshots',
			array(
				'provider_name' => sanitize_key( $provider ),
				'sport_slug'    => sanitize_key( $sport ),
				'sync_type'     => sanitize_key( $sync_type ),
				'payload_json'  => wp_json_encode( $payload ) ?: '[]',
				'item_count'    => count( $payload ),
				'updated_at'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}

	/** Persist normalized matches independently from rolling provider snapshots. */
	public function upsert_matches( string $provider, string $sport, array $matches ): int {
		$table = $this->database->prefix . 'instascore_provider_matches';
		$count = 0;
		$now = gmdate( 'Y-m-d H:i:s' );
		foreach ( $matches as $match ) {
			$provider_id = sanitize_text_field( (string) ( $match['providerId'] ?? '' ) );
			$kickoff = strtotime( (string) ( $match['kickoffAt'] ?? '' ) );
			if ( '' === $provider_id || false === $kickoff ) {
				continue;
			}
			$status = sanitize_key( (string) ( $match['status'] ?? 'draft' ) );
			$completed_at = in_array( $status, array( 'completed', 'confirmed' ), true ) ? $now : null;
			$sql = $this->database->prepare(
				"INSERT INTO {$table} (provider_name,sport_slug,provider_match_id,competition_provider_id,season_provider_id,home_team_provider_id,away_team_provider_id,kickoff_at,status,status_short,home_score,away_score,payload_json,first_seen_at,last_seen_at,completed_at)
				VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%d,%d,%s,%s,%s,NULLIF(%s,''))
				ON DUPLICATE KEY UPDATE competition_provider_id=VALUES(competition_provider_id),season_provider_id=VALUES(season_provider_id),home_team_provider_id=VALUES(home_team_provider_id),away_team_provider_id=VALUES(away_team_provider_id),kickoff_at=VALUES(kickoff_at),status=VALUES(status),status_short=VALUES(status_short),home_score=VALUES(home_score),away_score=VALUES(away_score),payload_json=VALUES(payload_json),last_seen_at=VALUES(last_seen_at),completed_at=COALESCE(completed_at,VALUES(completed_at))",
				sanitize_key( $provider ), sanitize_key( $sport ), $provider_id,
				sanitize_text_field( (string) ( $match['competitionProviderId'] ?? '' ) ),
				sanitize_text_field( (string) ( $match['seasonProviderId'] ?? '' ) ),
				sanitize_text_field( (string) ( $match['homeTeamProviderId'] ?? '' ) ),
				sanitize_text_field( (string) ( $match['awayTeamProviderId'] ?? '' ) ),
				gmdate( 'Y-m-d H:i:s', $kickoff ), $status,
				sanitize_text_field( (string) ( $match['statusShort'] ?? '' ) ),
				(int) ( $match['homeScore'] ?? 0 ), (int) ( $match['awayScore'] ?? 0 ),
				wp_json_encode( $match ) ?: '{}', $now, $now, $completed_at
			);
			if ( false !== $this->database->query( $sql ) ) {
				++$count;
			}
		}
		return $count;
	}

	/** @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null} */
	public function canonical_matches( string $provider, string $sport, string $period, int $limit = 200 ): array {
		$table = $this->database->prefix . 'instascore_provider_matches';
		$now = gmdate( 'Y-m-d H:i:s' );
		$where = match ( $period ) {
			'live' => "status IN ('warmup','live','halftime','interval','suspended') AND last_seen_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)",
			'upcoming' => "status IN ('draft','scheduled','postponed') AND kickoff_at >= %s",
			'previous' => "status IN ('completed','confirmed','cancelled','abandoned') AND kickoff_at <= %s",
			default => '1=1',
		};
		$args = array( sanitize_key( $provider ), sanitize_key( $sport ) );
		if ( str_contains( $where, '%s' ) ) $args[] = $now;
		$args[] = max( 1, min( 500, $limit ) );
		$order = 'previous' === $period ? 'kickoff_at DESC' : 'kickoff_at ASC';
		$rows = $this->database->get_results( $this->database->prepare( "SELECT payload_json,last_seen_at FROM {$table} WHERE provider_name=%s AND sport_slug=%s AND {$where} ORDER BY {$order} LIMIT %d", ...$args ), ARRAY_A );
		return $this->decode_match_rows( is_array( $rows ) ? $rows : array() );
	}

	/** @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null} */
	public function canonical_matches_for_date( string $provider, string $sport, string $date ): array {
		$table = $this->database->prefix . 'instascore_provider_matches';
		$start = new \DateTimeImmutable( $date . ' 00:00:00', new \DateTimeZone( 'Africa/Lagos' ) );
		$start = $start->setTimezone( new \DateTimeZone( 'UTC' ) );
		$end = $start->modify( '+1 day' );
		$rows = $this->database->get_results( $this->database->prepare( "SELECT payload_json,last_seen_at FROM {$table} WHERE provider_name=%s AND sport_slug=%s AND kickoff_at >= %s AND kickoff_at < %s ORDER BY kickoff_at ASC", sanitize_key( $provider ), sanitize_key( $sport ), $start->format( 'Y-m-d H:i:s' ), $end->format( 'Y-m-d H:i:s' ) ), ARRAY_A );
		return $this->decode_match_rows( is_array( $rows ) ? $rows : array() );
	}

	public function canonical_match( string $provider, string $sport, string $provider_id ): ?array {
		$table = $this->database->prefix . 'instascore_provider_matches';
		$row = $this->database->get_row( $this->database->prepare( "SELECT payload_json FROM {$table} WHERE provider_name=%s AND sport_slug=%s AND provider_match_id=%s LIMIT 1", sanitize_key( $provider ), sanitize_key( $sport ), $provider_id ), ARRAY_A );
		$match = is_array( $row ) ? json_decode( (string) $row['payload_json'], true ) : null;
		return is_array( $match ) ? $match : null;
	}

	/** @return array{total:int,lastSeenAt:string|null,completed:int,live:int,scheduled:int} */
	public function canonical_match_stats( string $provider, string $sport ): array {
		$table = $this->database->prefix . 'instascore_provider_matches';
		$row = $this->database->get_row( $this->database->prepare( "SELECT COUNT(*) total,MAX(last_seen_at) last_seen_at,SUM(status IN ('completed','confirmed')) completed,SUM(status IN ('warmup','live','halftime','interval')) live,SUM(status IN ('draft','scheduled','postponed')) scheduled FROM {$table} WHERE provider_name=%s AND sport_slug=%s", sanitize_key( $provider ), sanitize_key( $sport ) ), ARRAY_A );
		return array(
			'total'      => (int) ( $row['total'] ?? 0 ),
			'lastSeenAt' => isset( $row['last_seen_at'] ) ? (string) $row['last_seen_at'] : null,
			'completed'  => (int) ( $row['completed'] ?? 0 ),
			'live'       => (int) ( $row['live'] ?? 0 ),
			'scheduled'  => (int) ( $row['scheduled'] ?? 0 ),
		);
	}

	/** @param array<int,array<string,mixed>> $rows @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null} */
	private function decode_match_rows( array $rows ): array {
		$items = array();
		$latest = null;
		foreach ( $rows as $row ) {
			$item = json_decode( (string) ( $row['payload_json'] ?? '' ), true );
			if ( is_array( $item ) ) $items[] = $item;
			if ( null === $latest || (string) ( $row['last_seen_at'] ?? '' ) > $latest ) $latest = (string) $row['last_seen_at'];
		}
		return array( 'items' => $items, 'lastKnownAt' => $latest );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function conflicts( string $sport = '' ): array {
		$where = '' === $sport ? "status = 'conflict'" : $this->database->prepare( "status = 'conflict' AND sport_slug = %s", $sport );
		$rows = $this->database->get_results(
			"SELECT * FROM {$this->database->prefix}instascore_provider_mappings WHERE {$where} ORDER BY updated_at DESC LIMIT 50",
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function recent_logs( string $provider = '' ): array {
		$where = '' === $provider ? '' : $this->database->prepare( 'WHERE provider_name = %s', $provider );
		$rows = $this->database->get_results(
			"SELECT * FROM {$this->database->prefix}instascore_provider_sync_logs {$where} ORDER BY created_at DESC LIMIT 20",
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * @return array{items:array<int,array<string,mixed>>,lastKnownAt:string|null}
	 */
	public function latest_preview( string $provider, string $sync_type ): array {
		$snapshot = $this->database->get_row(
			$this->database->prepare(
				"SELECT payload_json,updated_at FROM {$this->database->prefix}instascore_provider_snapshots WHERE provider_name = %s AND sync_type = %s LIMIT 1",
				$provider,
				$sync_type
			),
			ARRAY_A
		);
		if ( is_array( $snapshot ) ) {
			$items = json_decode( (string) $snapshot['payload_json'], true );
			return array( 'items' => is_array( $items ) ? $items : array(), 'lastKnownAt' => $snapshot['updated_at'] ?? null );
		}
		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT preview_json,last_known_at FROM {$this->database->prefix}instascore_provider_sync_logs WHERE provider_name = %s AND sync_type = %s AND status = 'succeeded' ORDER BY created_at DESC LIMIT 1",
				$provider,
				$sync_type
			),
			ARRAY_A
		);

		if ( ! is_array( $row ) ) {
			return array( 'items' => array(), 'lastKnownAt' => null );
		}

		$items = json_decode( (string) $row['preview_json'], true );
		return array(
			'items'       => is_array( $items ) ? $items : array(),
			'lastKnownAt' => $row['last_known_at'] ?? null,
		);
	}
}
