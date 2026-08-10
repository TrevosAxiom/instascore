<?php
/**
 * Team registration reads.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class RegistrationRepository extends BaseRepository {
	public function active_for_player_season( int $player_id, int $season_id, ?string $exclude_uuid = null ): ?array {
		$sql = $this->database->prepare(
			"SELECT * FROM {$this->table} WHERE player_id = %d AND season_id = %d AND status = 'active' " . ( null === $exclude_uuid ? '' : 'AND uuid <> %s ' ) . 'LIMIT 1',
			null === $exclude_uuid ? array( $player_id, $season_id ) : array( $player_id, $season_id, $exclude_uuid )
		);
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function jersey_conflict( int $team_id, int $season_id, int $jersey_number, ?string $exclude_uuid = null ): ?array {
		$sql = $this->database->prepare(
			"SELECT * FROM {$this->table} WHERE team_id = %d AND season_id = %d AND jersey_number = %d AND status = 'active' " . ( null === $exclude_uuid ? '' : 'AND uuid <> %s ' ) . 'LIMIT 1',
			null === $exclude_uuid ? array( $team_id, $season_id, $jersey_number ) : array( $team_id, $season_id, $jersey_number, $exclude_uuid )
		);
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function history_for_player( int $player_id ): array {
		$sql  = $this->database->prepare(
			"SELECT r.*,t.uuid team_uuid,t.name team_name,se.uuid season_uuid,se.name season_name FROM {$this->table} r JOIN {$this->database->prefix}instascore_teams t ON t.id = r.team_id JOIN {$this->database->prefix}instascore_seasons se ON se.id = r.season_id WHERE r.player_id = %d ORDER BY r.registered_at DESC",
			$player_id
		);
		$rows = $this->database->get_results( $sql, ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}
}
