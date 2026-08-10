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
