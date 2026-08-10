<?php
/**
 * Shared table repository.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use RuntimeException;
use wpdb;

class BaseRepository {
	protected string $table;

	public function __construct(
		protected readonly wpdb $database,
		string $entity
	) {
		$this->table = $database->prefix . 'instascore_' . $entity;
	}

	/**
	 * @param array<string,mixed> $data Data.
	 */
	public function create( array $data ): array {
		$result = $this->database->insert( $this->table, $data );
		if ( false === $result ) {
			throw new RuntimeException( 'Unable to create record.' );
		}
		return $this->find_by_uuid( (string) $data['uuid'] ) ?? $data;
	}

	/**
	 * @param array<string,mixed> $data Data.
	 */
	public function update( string $uuid, array $data ): array {
		$result = $this->database->update( $this->table, $data, array( 'uuid' => $uuid ) );
		if ( false === $result ) {
			throw new RuntimeException( 'Unable to update record.' );
		}
		return $this->find_by_uuid( $uuid ) ?? array_merge( array( 'uuid' => $uuid ), $data );
	}

	public function find_by_uuid( string $uuid ): ?array {
		$sql = $this->database->prepare( "SELECT * FROM {$this->table} WHERE uuid = %s LIMIT 1", $uuid );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function id_for_uuid( string $uuid ): ?int {
		$row = $this->find_by_uuid( $uuid );
		return null === $row ? null : (int) $row['id'];
	}

	/** @return array<int,array<string,mixed>> */
	public function active_list(): array {
		$rows = $this->database->get_results( "SELECT * FROM {$this->table} WHERE status = 'active' ORDER BY created_at DESC LIMIT 100", ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	/** @return array<int,array<string,mixed>> */
	public function admin_list(): array {
		$rows = $this->database->get_results( "SELECT * FROM {$this->table} WHERE status IN ('active','archived') ORDER BY created_at DESC LIMIT 100", ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}
}
