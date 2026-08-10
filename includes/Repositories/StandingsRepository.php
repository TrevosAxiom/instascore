<?php
/**
 * Standings projection repository.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use wpdb;

final class StandingsRepository {
	public function __construct( private readonly wpdb $database ) {}

	public function replace_scope( int $competition_id, int $season_id, ?int $stage_id, ?int $group_id, array $rows, string $hash ): void {
		$table = $this->database->prefix . 'instascore_standings';
		$this->database->delete( $table, array( 'competition_id' => $competition_id, 'season_id' => $season_id ) );
		foreach ( $rows as $row ) {
			$this->database->insert(
				$table,
				array(
					'uuid'             => wp_generate_uuid4(),
					'competition_id'   => $competition_id,
					'season_id'        => $season_id,
					'stage_id'         => $stage_id,
					'group_id'         => $group_id,
					'team_id'          => (int) $row['team_id'],
					'position'         => (int) $row['position'],
					'played'           => (int) $row['played'],
					'wins'             => (int) $row['wins'],
					'draws'            => (int) $row['draws'],
					'losses'           => (int) $row['losses'],
					'points'           => (int) $row['points'],
					'points_for'       => (int) $row['points_for'],
					'points_against'   => (int) $row['points_against'],
					'point_difference' => (int) $row['point_difference'],
					'form'             => (string) $row['form'],
					'tiebreaker_json'  => wp_json_encode( $row['tiebreaker_order'] ?? array() ),
					'rebuild_hash'     => $hash,
					'updated_at'       => gmdate( 'Y-m-d H:i:s' ),
				)
			);
		}
	}

	public function snapshot( int $competition_id, int $season_id, ?int $stage_id, ?int $group_id, array $rows, string $hash ): void {
		$this->database->insert(
			$this->database->prefix . 'instascore_standings_snapshots',
			array(
				'uuid'           => wp_generate_uuid4(),
				'competition_id' => $competition_id,
				'season_id'      => $season_id,
				'stage_id'       => $stage_id,
				'group_id'       => $group_id,
				'snapshot_json'  => wp_json_encode( $rows ),
				'rebuild_hash'   => $hash,
				'created_by'     => get_current_user_id() ?: null,
				'created_at'     => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}

	public function public_table( string $competition_uuid, string $season_uuid = '' ): array {
		$prefix = $this->database->prefix . 'instascore_';
		$args   = array( $competition_uuid );
		$where  = 'c.uuid = %s';
		if ( '' !== $season_uuid ) {
			$where .= ' AND s.uuid = %s';
			$args[] = $season_uuid;
		}
		$sql  = "SELECT st.*,t.uuid team_uuid,t.name team_name,c.uuid competition_uuid,c.name competition_name,s.uuid season_uuid,s.name season_name FROM {$prefix}standings st JOIN {$prefix}teams t ON t.id = st.team_id JOIN {$prefix}competitions c ON c.id = st.competition_id JOIN {$prefix}seasons s ON s.id = st.season_id WHERE {$where} ORDER BY st.position ASC, t.name ASC";
		$rows = $this->database->get_results( $this->database->prepare( $sql, $args ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}
}
