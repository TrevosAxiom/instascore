<?php
/**
 * Match-event storage.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class MatchEventRepository extends BaseRepository {
	public function find_by_client_event_id( int $fixture_id, string $client_event_id ): ?array {
		$sql = $this->database->prepare( "SELECT * FROM {$this->table} WHERE fixture_id = %d AND client_event_id = %s LIMIT 1", $fixture_id, $client_event_id );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function find_by_id( int $id ): ?array {
		$sql = $this->database->prepare( "SELECT * FROM {$this->table} WHERE id = %d LIMIT 1", $id );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function id_for_uuid( string $uuid ): ?int {
		return parent::id_for_uuid( $uuid );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function for_fixture( int $fixture_id, int $after_revision = 0 ): array {
		$sql  = 'SELECT * FROM ' . $this->table . ' WHERE fixture_id = %d AND revision > %d ORDER BY sequence_number ASC';
		$rows = $this->database->get_results( $this->database->prepare( $sql, $fixture_id, $after_revision ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public function current_revision( int $fixture_id ): int {
		return (int) $this->database->get_var( $this->database->prepare( "SELECT COALESCE(MAX(revision),0) FROM {$this->table} WHERE fixture_id = %d", $fixture_id ) );
	}

	public function next_sequence( int $fixture_id ): int {
		return 1 + (int) $this->database->get_var( $this->database->prepare( "SELECT COALESCE(MAX(sequence_number),0) FROM {$this->table} WHERE fixture_id = %d", $fixture_id ) );
	}

	public function void_event( string $uuid, string $reason ): array {
		return $this->update(
			$uuid,
			array(
				'voided_at'   => gmdate( 'Y-m-d H:i:s' ),
				'voided_by'   => get_current_user_id(),
				'void_reason' => $reason,
			)
		);
	}
}
