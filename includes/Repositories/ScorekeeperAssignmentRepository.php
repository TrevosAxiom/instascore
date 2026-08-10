<?php
/**
 * Scorekeeper assignment storage.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class ScorekeeperAssignmentRepository extends BaseRepository {
	public function active_for_user_fixture( int $fixture_id, int $user_id ): ?array {
		$sql = $this->database->prepare( "SELECT * FROM {$this->table} WHERE fixture_id = %d AND user_id = %d AND status = 'active' LIMIT 1", $fixture_id, $user_id );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function claimed_for_fixture( int $fixture_id ): ?array {
		$sql = $this->database->prepare( "SELECT * FROM {$this->table} WHERE fixture_id = %d AND status = 'active' AND claimed_at IS NOT NULL AND released_at IS NULL LIMIT 1", $fixture_id );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}
}
