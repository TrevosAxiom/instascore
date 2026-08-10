<?php
/**
 * Fantasy scoring, transfer and league data access.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use wpdb;

final class FantasyScoringRepository {
	public function __construct( private readonly wpdb $database ) {}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function rules_for_game( int $game_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT * FROM {$this->database->prefix}instascore_fantasy_scoring_rules WHERE fantasy_game_id = %d AND status = 'active' ORDER BY effective_from DESC, version DESC",
				$game_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public function game_by_uuid( string $uuid ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare( "SELECT * FROM {$this->database->prefix}instascore_fantasy_games WHERE uuid = %s LIMIT 1", $uuid ),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function points_breakdown( int $user_id, string $game_uuid ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT fp.*,p.display_name player_name,fpl.uuid fantasy_player_uuid
				FROM {$this->database->prefix}instascore_fantasy_points fp
				JOIN {$this->database->prefix}instascore_fantasy_players fpl ON fpl.id = fp.fantasy_player_id
				JOIN {$this->database->prefix}instascore_players p ON p.id = fp.player_id
				JOIN {$this->database->prefix}instascore_fantasy_games g ON g.id = fp.fantasy_game_id
				WHERE g.uuid = %s
				ORDER BY fp.updated_at DESC LIMIT 100",
				$game_uuid
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function live_tracker( string $game_uuid ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT fp.fantasy_player_id,SUM(fp.points) points,MAX(fp.status) status,p.display_name player_name
				FROM {$this->database->prefix}instascore_fantasy_points fp
				JOIN {$this->database->prefix}instascore_fantasy_players fpl ON fpl.id = fp.fantasy_player_id
				JOIN {$this->database->prefix}instascore_players p ON p.id = fpl.player_id
				JOIN {$this->database->prefix}instascore_fantasy_games g ON g.id = fp.fantasy_game_id
				WHERE g.uuid = %s
				GROUP BY fp.fantasy_player_id,p.display_name
				ORDER BY points DESC LIMIT 50",
				$game_uuid
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public function create_rule( array $input ): array {
		$now = gmdate( 'Y-m-d H:i:s' );
		$row = array(
			'uuid'            => wp_generate_uuid4(),
			'fantasy_game_id' => (int) $input['fantasy_game_id'],
			'sport_slug'      => sanitize_key( (string) $input['sportSlug'] ),
			'event_type'      => sanitize_key( (string) $input['eventType'] ),
			'points'          => (int) $input['points'],
			'version'         => (int) ( $input['version'] ?? 1 ),
			'effective_from'  => sanitize_text_field( (string) ( $input['effectiveFrom'] ?? $now ) ),
			'effective_to'    => empty( $input['effectiveTo'] ) ? null : sanitize_text_field( (string) $input['effectiveTo'] ),
			'status'          => 'active',
			'conditions_json' => wp_json_encode( $input['conditions'] ?? array() ) ?: '{}',
			'created_at'      => $now,
			'updated_at'      => $now,
		);
		$this->database->insert( $this->database->prefix . 'instascore_fantasy_scoring_rules', $row );
		return $row;
	}

	public function record_override( int $game_id, int $gameweek_id, int $points_after, string $reason, int $user_id ): array {
		$row = array(
			'uuid'              => wp_generate_uuid4(),
			'fantasy_point_id'  => null,
			'fantasy_game_id'   => $game_id,
			'gameweek_id'       => $gameweek_id,
			'fantasy_player_id' => null,
			'revision'          => time(),
			'action'            => 'admin_override',
			'points_before'     => null,
			'points_after'      => $points_after,
			'reason'            => sanitize_textarea_field( $reason ),
			'snapshot_json'     => wp_json_encode( array( 'manual' => true, 'points' => $points_after ) ) ?: '{}',
			'created_by'        => $user_id,
			'created_at'        => gmdate( 'Y-m-d H:i:s' ),
		);
		$this->database->insert( $this->database->prefix . 'instascore_fantasy_point_revisions', $row );
		return $row;
	}

	public function create_transfer( array $row ): array {
		$row['uuid']       = wp_generate_uuid4();
		$row['created_at'] = gmdate( 'Y-m-d H:i:s' );
		$this->database->insert( $this->database->prefix . 'instascore_fantasy_transfers', $row );
		return $row;
	}

	public function gameweek_deadline( int $gameweek_id ): ?string {
		$value = $this->database->get_var(
			$this->database->prepare( "SELECT deadline_at FROM {$this->database->prefix}instascore_fantasy_gameweeks WHERE id = %d LIMIT 1", $gameweek_id )
		);
		return is_string( $value ) && '' !== $value ? $value : null;
	}

	public function completed_transfer_count( int $user_id, int $game_id, int $gameweek_id ): int {
		return (int) $this->database->get_var(
			$this->database->prepare(
				"SELECT COUNT(*) FROM {$this->database->prefix}instascore_fantasy_transfers WHERE user_id = %d AND fantasy_game_id = %d AND gameweek_id = %d AND status = 'completed'",
				$user_id,
				$game_id,
				$gameweek_id
			)
		);
	}

	public function create_league( array $row ): array {
		$now               = gmdate( 'Y-m-d H:i:s' );
		$row['uuid']       = wp_generate_uuid4();
		$row['invite_code'] = 'private' === $row['visibility'] ? strtoupper( wp_generate_password( 8, false, false ) ) : null;
		$row['created_at'] = $now;
		$row['updated_at'] = $now;
		$this->database->insert( $this->database->prefix . 'instascore_fantasy_leagues', $row );
		$row['id'] = (int) $this->database->insert_id;
		return $row;
	}

	public function league_by_uuid( string $uuid ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare( "SELECT * FROM {$this->database->prefix}instascore_fantasy_leagues WHERE uuid = %s LIMIT 1", $uuid ),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	public function is_member( int $league_id, int $user_id ): bool {
		return (bool) $this->database->get_var(
			$this->database->prepare( "SELECT id FROM {$this->database->prefix}instascore_fantasy_league_members WHERE league_id = %d AND user_id = %d AND status = 'active' LIMIT 1", $league_id, $user_id )
		);
	}

	public function join_league( int $league_id, int $user_id ): array {
		$row = array(
			'uuid'      => wp_generate_uuid4(),
			'league_id' => $league_id,
			'user_id'   => $user_id,
			'squad_id'  => null,
			'role'      => 'member',
			'status'    => 'active',
			'joined_at' => gmdate( 'Y-m-d H:i:s' ),
		);
		$this->database->replace( $this->database->prefix . 'instascore_fantasy_league_members', $row );
		return $row;
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function league_table( int $league_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT m.user_id,u.display_name,COALESCE(SUM(t.gameweek_points),0) points,MIN(t.previous_rank_position) previous_rank
				FROM {$this->database->prefix}instascore_fantasy_league_members m
				LEFT JOIN {$this->database->prefix}instascore_fantasy_squad_totals t ON t.user_id = m.user_id
				LEFT JOIN {$this->database->users} u ON u.ID = m.user_id
				WHERE m.league_id = %d AND m.status = 'active'
				GROUP BY m.user_id,u.display_name
				ORDER BY points DESC,u.display_name ASC",
				$league_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}
}
