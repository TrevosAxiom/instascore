<?php
/**
 * Fantasy data access.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use wpdb;

final class FantasyRepository {
	public function __construct( private readonly wpdb $database ) {}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function public_games(): array {
		$rows = $this->database->get_results(
			"SELECT g.*,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug
			FROM {$this->database->prefix}instascore_fantasy_games g
			JOIN {$this->database->prefix}instascore_sports s ON s.id = g.sport_id
			WHERE g.status IN ('open','active')
			ORDER BY g.updated_at DESC",
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public function find_game( string $uuid ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT g.*,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug
				FROM {$this->database->prefix}instascore_fantasy_games g
				JOIN {$this->database->prefix}instascore_sports s ON s.id = g.sport_id
				WHERE g.uuid = %s LIMIT 1",
				$uuid
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	public function current_gameweek( int $game_id ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT gw.*,fs.uuid fantasy_season_uuid,fs.name fantasy_season_name,fs.id fantasy_season_id
				FROM {$this->database->prefix}instascore_fantasy_gameweeks gw
				JOIN {$this->database->prefix}instascore_fantasy_seasons fs ON fs.id = gw.fantasy_season_id
				WHERE fs.fantasy_game_id = %d AND gw.status IN ('scheduled','open')
				ORDER BY gw.sequence_number ASC LIMIT 1",
				$game_id
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function positions( int $game_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT * FROM {$this->database->prefix}instascore_fantasy_positions WHERE fantasy_game_id = %d ORDER BY sort_order ASC, code ASC",
				$game_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * @param array<string,mixed> $query Query.
	 * @return array<int,array<string,mixed>>
	 */
	public function player_pool( int $game_id, array $query = array() ): array {
		$where = array( 'fp.fantasy_game_id = %d' );
		$args  = array( $game_id );
		if ( ! empty( $query['search'] ) ) {
			$where[] = '(p.display_name LIKE %s OR t.name LIKE %s)';
			$term    = '%' . $this->database->esc_like( sanitize_text_field( (string) $query['search'] ) ) . '%';
			array_push( $args, $term, $term );
		}
		if ( ! empty( $query['position'] ) ) {
			$where[] = 'pos.code = %s';
			$args[]  = sanitize_key( (string) $query['position'] );
		}
		$sql = "SELECT fp.*,p.uuid player_uuid,p.display_name player_name,p.photo_url,t.uuid team_uuid,t.name team_name,pos.code position_code,pos.name position_name
			FROM {$this->database->prefix}instascore_fantasy_players fp
			JOIN {$this->database->prefix}instascore_players p ON p.id = fp.player_id
			LEFT JOIN {$this->database->prefix}instascore_teams t ON t.id = fp.team_id
			JOIN {$this->database->prefix}instascore_fantasy_positions pos ON pos.id = fp.position_id
			WHERE " . implode( ' AND ', $where ) . " ORDER BY fp.price_cents DESC, p.display_name ASC LIMIT 100";
		$rows = $this->database->get_results( $this->database->prepare( $sql, $args ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public function squad_for_user( int $user_id, int $game_id, int $gameweek_id ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$this->database->prefix}instascore_fantasy_squads WHERE user_id = %d AND fantasy_game_id = %d AND gameweek_id = %d LIMIT 1",
				$user_id,
				$game_id,
				$gameweek_id
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function squad_players( int $squad_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT sp.*,fp.uuid fantasy_player_uuid,fp.price_cents,fp.team_id,p.uuid player_uuid,p.display_name player_name,t.uuid team_uuid,t.name team_name,pos.code position_code,pos.name position_name
				FROM {$this->database->prefix}instascore_fantasy_squad_players sp
				JOIN {$this->database->prefix}instascore_fantasy_players fp ON fp.id = sp.fantasy_player_id
				JOIN {$this->database->prefix}instascore_players p ON p.id = fp.player_id
				LEFT JOIN {$this->database->prefix}instascore_teams t ON t.id = fp.team_id
				JOIN {$this->database->prefix}instascore_fantasy_positions pos ON pos.id = fp.position_id
				WHERE sp.squad_id = %d ORDER BY sp.slot_type ASC, sp.slot_number ASC",
				$squad_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * @param array<int,string> $uuids Fantasy player UUIDs.
	 * @return array<int,array<string,mixed>>
	 */
	public function fantasy_players_by_uuid( int $game_id, array $uuids ): array {
		if ( empty( $uuids ) ) {
			return array();
		}
		$placeholders = implode( ',', array_fill( 0, count( $uuids ), '%s' ) );
		$args         = array_merge( array( $game_id ), array_map( 'sanitize_text_field', $uuids ) );
		$rows         = $this->database->get_results(
			$this->database->prepare(
				"SELECT fp.*,pos.code position_code,pos.min_squad,pos.max_squad,pos.min_starting,pos.max_starting
				FROM {$this->database->prefix}instascore_fantasy_players fp
				JOIN {$this->database->prefix}instascore_fantasy_positions pos ON pos.id = fp.position_id
				WHERE fp.fantasy_game_id = %d AND fp.uuid IN ({$placeholders})",
				$args
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * @param array<string,mixed>              $squad Squad row.
	 * @param array<int,array<string,mixed>>   $entries Entries.
	 * @param array<string,mixed>              $snapshot Snapshot.
	 */
	public function save_squad( array $squad, array $entries, array $snapshot, string $action ): array {
		$now = gmdate( 'Y-m-d H:i:s' );
		$this->database->query( 'START TRANSACTION' );
		try {
			if ( empty( $squad['id'] ) ) {
				$squad['uuid']       = wp_generate_uuid4();
				$squad['created_at'] = $now;
				$this->database->insert( $this->database->prefix . 'instascore_fantasy_squads', $squad );
				$squad['id'] = (int) $this->database->insert_id;
			} else {
				$this->database->update( $this->database->prefix . 'instascore_fantasy_squads', $squad, array( 'id' => (int) $squad['id'] ) );
				$this->database->delete( $this->database->prefix . 'instascore_fantasy_squad_players', array( 'squad_id' => (int) $squad['id'] ) );
			}

			foreach ( $entries as $entry ) {
				$entry['uuid']       = wp_generate_uuid4();
				$entry['squad_id']   = (int) $squad['id'];
				$entry['created_at'] = $now;
				$this->database->insert( $this->database->prefix . 'instascore_fantasy_squad_players', $entry );
			}

			$this->database->insert(
				$this->database->prefix . 'instascore_fantasy_squad_history',
				array(
					'uuid'          => wp_generate_uuid4(),
					'squad_id'      => (int) $squad['id'],
					'user_id'       => (int) $squad['user_id'],
					'revision'      => (int) $squad['revision'],
					'action'        => $action,
					'snapshot_json' => wp_json_encode( $snapshot ),
					'created_at'    => $now,
				)
			);
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}

		return $this->squad_for_user( (int) $squad['user_id'], (int) $squad['fantasy_game_id'], (int) $squad['gameweek_id'] ) ?? $squad;
	}

	/**
	 * @param array<string,mixed> $input Game input.
	 */
	public function create_game( array $input, int $user_id ): array {
		$now = gmdate( 'Y-m-d H:i:s' );
		$row = array(
			'uuid'                 => wp_generate_uuid4(),
			'sport_id'             => (int) $input['sportId'],
			'name'                 => sanitize_text_field( (string) $input['name'] ),
			'slug'                 => sanitize_title( (string) $input['name'] ),
			'description'          => sanitize_textarea_field( (string) ( $input['description'] ?? '' ) ),
			'status'               => sanitize_key( (string) ( $input['status'] ?? 'draft' ) ),
			'budget_cents'         => (int) ( $input['budgetCents'] ?? 100000 ),
			'squad_size'           => (int) ( $input['squadSize'] ?? 15 ),
			'starting_size'        => (int) ( $input['startingSize'] ?? 7 ),
			'bench_size'           => (int) ( $input['benchSize'] ?? 8 ),
			'max_players_per_team' => (int) ( $input['maxPlayersPerTeam'] ?? 3 ),
			'formation_rules_json' => wp_json_encode( $input['formationRules'] ?? array() ) ?: '{}',
			'created_by'           => $user_id,
			'updated_by'           => $user_id,
			'created_at'           => $now,
			'updated_at'           => $now,
		);
		$this->database->insert( $this->database->prefix . 'instascore_fantasy_games', $row );
		return $row;
	}
}
