<?php
/**
 * Team and player statistic projections.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use wpdb;

final class StatisticsRepository {
	public function __construct( private readonly wpdb $database ) {}

	public function replace_team_stats( int $competition_id, int $season_id, array $stats, string $hash ): void {
		$table = $this->database->prefix . 'instascore_team_statistics';
		$this->database->delete( $table, array( 'competition_id' => $competition_id, 'season_id' => $season_id ) );
		foreach ( $stats as $team_id => $values ) {
			foreach ( $values as $key => $value ) {
				if ( in_array( $key, array( 'team_id', 'team_name' ), true ) ) {
					continue;
				}
				$this->database->insert( $table, $this->row( $competition_id, $season_id, (int) $team_id, null, (string) $key, (int) $value, $hash ) );
			}
		}
	}

	public function replace_player_stats( int $competition_id, int $season_id, array $stats, string $hash ): void {
		$table = $this->database->prefix . 'instascore_player_statistics';
		$this->database->delete( $table, array( 'competition_id' => $competition_id, 'season_id' => $season_id ) );
		foreach ( $stats as $player_id => $values ) {
			foreach ( $values as $key => $value ) {
				if ( in_array( $key, array( 'player_id', 'team_id' ), true ) ) {
					continue;
				}
				$this->database->insert( $table, $this->row( $competition_id, $season_id, (int) ( $values['team_id'] ?? 0 ), (int) $player_id, (string) $key, (int) $value, $hash ) );
			}
		}
	}

	public function team_stats( string $team_uuid ): array {
		$prefix = $this->database->prefix . 'instascore_';
		$sql    = $this->database->prepare( "SELECT ts.*,t.uuid team_uuid,t.name team_name FROM {$prefix}team_statistics ts JOIN {$prefix}teams t ON t.id = ts.team_id WHERE t.uuid = %s ORDER BY ts.stat_key ASC", $team_uuid );
		$rows   = $this->database->get_results( $sql, ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public function leaders( string $stat_key, int $limit = 10 ): array {
		$prefix = $this->database->prefix . 'instascore_';
		$sql    = $this->database->prepare( "SELECT ps.*,p.uuid player_uuid,p.display_name player_name,t.uuid team_uuid,t.name team_name FROM {$prefix}player_statistics ps JOIN {$prefix}players p ON p.id = ps.player_id LEFT JOIN {$prefix}teams t ON t.id = ps.team_id WHERE ps.stat_key = %s ORDER BY ps.stat_value DESC,p.display_name ASC LIMIT %d", $stat_key, $limit );
		$rows   = $this->database->get_results( $sql, ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	private function row( int $competition_id, int $season_id, int $team_id, ?int $player_id, string $key, int $value, string $hash ): array {
		return array(
			'uuid'           => wp_generate_uuid4(),
			'competition_id' => $competition_id,
			'season_id'      => $season_id,
			'team_id'        => 0 === $team_id ? null : $team_id,
			'player_id'      => $player_id,
			'stat_key'       => $key,
			'stat_value'     => $value,
			'rebuild_hash'   => $hash,
			'updated_at'     => gmdate( 'Y-m-d H:i:s' ),
		);
	}
}
