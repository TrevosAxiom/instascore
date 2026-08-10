<?php
/**
 * Match clock state storage.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class MatchClockRepository extends BaseRepository {
	public function for_fixture( int $fixture_id ): ?array {
		$sql = $this->database->prepare( "SELECT * FROM {$this->table} WHERE fixture_id = %d LIMIT 1", $fixture_id );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function ensure( int $fixture_id ): array {
		$existing = $this->for_fixture( $fixture_id );
		if ( null !== $existing ) {
			return $existing;
		}
		return $this->create(
			array(
				'uuid'          => wp_generate_uuid4(),
				'fixture_id'    => $fixture_id,
				'status'        => 'not_started',
				'period'        => 0,
				'period_label'  => 'Pregame',
				'clock_seconds' => 0,
				'running'       => 0,
				'started_at'    => null,
				'paused_at'     => null,
				'revision'      => 0,
				'updated_by'    => get_current_user_id(),
				'updated_at'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}
}
