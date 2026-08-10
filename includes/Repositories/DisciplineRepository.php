<?php
/**
 * Discipline and suspension repository.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class DisciplineRepository extends BaseRepository {
	public function active_suspensions_for_player( int $player_id, int $competition_id, int $season_id ): array {
		$table = $this->database->prefix . 'instascore_suspensions';
		$sql   = $this->database->prepare( "SELECT * FROM {$table} WHERE player_id = %d AND competition_id = %d AND season_id = %d AND status = 'active' AND (fixtures_remaining > 0 OR ends_at IS NULL OR ends_at >= UTC_TIMESTAMP())", $player_id, $competition_id, $season_id );
		$rows  = $this->database->get_results( $sql, ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}
}
