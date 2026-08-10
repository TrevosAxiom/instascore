<?php
/**
 * Season repository.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Repositories;

final class SeasonRepository extends BaseRepository {
	public function overlaps( int $competition_id, string $start, string $end, ?string $except_uuid = null ): bool {
		$sql  = "SELECT COUNT(*) FROM {$this->table} WHERE competition_id = %d AND status <> 'archived' AND start_date <= %s AND end_date >= %s";
		$args = array( $competition_id, $end, $start );
		if ( null !== $except_uuid ) {
			$sql   .= ' AND uuid <> %s';
			$args[] = $except_uuid;
		}
		return 0 < (int) $this->database->get_var( $this->database->prepare( $sql, $args ) );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function for_competition( int $competition_id, bool $include_archived = false ): array {
		$status = $include_archived ? "status IN ('active','archived')" : "status <> 'archived'";
		$sql  = "SELECT uuid,name,slug,start_date,end_date,status,updated_at FROM {$this->table} WHERE competition_id = %d AND {$status} ORDER BY start_date DESC";
		$rows = $this->database->get_results( $this->database->prepare( $sql, $competition_id ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public function competition_uuid( string $season_uuid ): ?string {
		$competitions = $this->database->prefix . 'instascore_competitions';
		$sql          = "SELECT c.uuid FROM {$this->table} s JOIN {$competitions} c ON c.id = s.competition_id WHERE s.uuid = %s LIMIT 1";
		$uuid         = $this->database->get_var( $this->database->prepare( $sql, $season_uuid ) );
		return is_string( $uuid ) ? $uuid : null;
	}
}
