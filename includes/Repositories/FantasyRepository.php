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

	/** @return array<int,array<string,mixed>> */
	public function admin_games(): array {
		$rows = $this->database->get_results(
			"SELECT g.*,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug
			FROM {$this->database->prefix}instascore_fantasy_games g
			JOIN {$this->database->prefix}instascore_sports s ON s.id = g.sport_id
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

	/** @return array<int,array<string,mixed>> */
	public function gameweeks( int $game_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT gw.* FROM {$this->database->prefix}instascore_fantasy_gameweeks gw
				JOIN {$this->database->prefix}instascore_fantasy_seasons fs ON fs.id = gw.fantasy_season_id
				WHERE fs.fantasy_game_id = %d ORDER BY gw.sequence_number DESC",
				$game_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public function create_gameweek( int $game_id, string $name, string $deadline ): array {
		$season_id = (int) $this->database->get_var( $this->database->prepare( "SELECT id FROM {$this->database->prefix}instascore_fantasy_seasons WHERE fantasy_game_id = %d AND status = 'active' LIMIT 1", $game_id ) );
		if ( $season_id < 1 ) {
			throw new \RuntimeException( 'Active fantasy season not found.' );
		}
		$sequence = 1 + (int) $this->database->get_var( $this->database->prepare( "SELECT COALESCE(MAX(sequence_number),0) FROM {$this->database->prefix}instascore_fantasy_gameweeks WHERE fantasy_season_id = %d", $season_id ) );
		$now = gmdate( 'Y-m-d H:i:s' );
		$row = array( 'uuid' => wp_generate_uuid4(), 'fantasy_season_id' => $season_id, 'name' => $name, 'sequence_number' => $sequence, 'deadline_at' => $deadline, 'status' => 'scheduled', 'created_at' => $now, 'updated_at' => $now );
		$this->database->query( 'START TRANSACTION' );
		try {
			$row['id'] = $this->insert_or_fail( $this->database->prefix . 'instascore_fantasy_gameweeks', $row );
			$previous = $this->database->get_results( $this->database->prepare( "SELECT * FROM {$this->database->prefix}instascore_fantasy_squads WHERE fantasy_game_id = %d AND status = 'submitted' AND gameweek_id <> %d ORDER BY gameweek_id DESC", $game_id, (int) $row['id'] ), ARRAY_A );
			$seen = array();
			foreach ( is_array( $previous ) ? $previous : array() as $squad ) {
				$user_id = (int) $squad['user_id'];
				if ( isset( $seen[ $user_id ] ) ) { continue; }
				$seen[ $user_id ] = true;
				$old_id = (int) $squad['id'];
				unset( $squad['id'] );
				$squad['uuid'] = wp_generate_uuid4();
				$squad['gameweek_id'] = (int) $row['id'];
				$squad['revision'] = 1;
				$squad['status'] = 'draft';
				$squad['submitted_at'] = null;
				$squad['created_at'] = $now;
				$squad['updated_at'] = $now;
				$new_id = $this->insert_or_fail( $this->database->prefix . 'instascore_fantasy_squads', $squad );
				$players = $this->database->get_results( $this->database->prepare( "SELECT * FROM {$this->database->prefix}instascore_fantasy_squad_players WHERE squad_id = %d", $old_id ), ARRAY_A );
				foreach ( is_array( $players ) ? $players : array() as $player ) { unset( $player['id'] ); $player['uuid'] = wp_generate_uuid4(); $player['squad_id'] = $new_id; $this->insert_or_fail( $this->database->prefix . 'instascore_fantasy_squad_players', $player ); }
			}
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) { $this->database->query( 'ROLLBACK' ); throw $error; }
		return $row;
	}

	public function set_gameweek_status( int $game_id, string $gameweek_uuid, string $status ): ?array {
		$row = $this->database->get_row( $this->database->prepare( "SELECT gw.* FROM {$this->database->prefix}instascore_fantasy_gameweeks gw JOIN {$this->database->prefix}instascore_fantasy_seasons fs ON fs.id = gw.fantasy_season_id WHERE fs.fantasy_game_id = %d AND gw.uuid = %s LIMIT 1", $game_id, $gameweek_uuid ), ARRAY_A );
		if ( ! is_array( $row ) ) { return null; }
		$this->database->update( $this->database->prefix . 'instascore_fantasy_gameweeks', array( 'status' => $status, 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'id' => (int) $row['id'] ) );
		$row['status'] = $status;
		return $row;
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
		if ( ! empty( $query['team'] ) ) {
			$where[] = 't.uuid = %s';
			$args[]  = sanitize_text_field( (string) $query['team'] );
		}
		if ( ! empty( $query['status'] ) ) {
			$where[] = 'fp.status = %s';
			$args[]  = sanitize_key( (string) $query['status'] );
		}
		$sorts = array( 'price' => 'fp.price_cents DESC', 'points' => 'total_points DESC', 'ownership' => 'ownership_count DESC', 'name' => 'p.display_name ASC' );
		$sort  = $sorts[ $query['sort'] ?? 'points' ] ?? $sorts['points'];
		$sql = "SELECT fp.*,p.uuid player_uuid,p.display_name player_name,p.photo_url,t.uuid team_uuid,t.name team_name,pos.code position_code,pos.name position_name,
			(SELECT COALESCE(SUM(fpt.points),0) FROM {$this->database->prefix}instascore_fantasy_points fpt
				WHERE fpt.fantasy_player_id = fp.id AND NOT EXISTS (SELECT 1 FROM {$this->database->prefix}instascore_fantasy_points newer WHERE newer.match_event_id = fpt.match_event_id AND newer.fantasy_player_id = fpt.fantasy_player_id AND newer.revision > fpt.revision)) total_points,
			(SELECT COUNT(DISTINCT fsp.squad_id) FROM {$this->database->prefix}instascore_fantasy_squad_players fsp JOIN {$this->database->prefix}instascore_fantasy_squads fsq ON fsq.id = fsp.squad_id WHERE fsp.fantasy_player_id = fp.id AND fsq.status = 'submitted') ownership_count,
			(SELECT COUNT(*) FROM {$this->database->prefix}instascore_fantasy_squads fsq WHERE fsq.fantasy_game_id = fp.fantasy_game_id AND fsq.status = 'submitted') manager_count
			FROM {$this->database->prefix}instascore_fantasy_players fp
			JOIN {$this->database->prefix}instascore_players p ON p.id = fp.player_id
			LEFT JOIN {$this->database->prefix}instascore_teams t ON t.id = fp.team_id
			JOIN {$this->database->prefix}instascore_fantasy_positions pos ON pos.id = fp.position_id
			WHERE " . implode( ' AND ', $where ) . " ORDER BY {$sort}, p.display_name ASC LIMIT 100";
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
		$context = $this->competition_season_context(
			sanitize_text_field( (string) ( $input['competitionUuid'] ?? '' ) ),
			sanitize_text_field( (string) ( $input['seasonUuid'] ?? '' ) )
		);
		if ( null === $context ) {
			throw new \InvalidArgumentException( 'The selected competition season is invalid.' );
		}
		$now = gmdate( 'Y-m-d H:i:s' );
		$row = array(
			'uuid'                 => wp_generate_uuid4(),
			'sport_id'             => (int) $context['sport_id'],
			'name'                 => sanitize_text_field( (string) $input['name'] ),
			'slug'                 => sanitize_title( (string) $input['name'] . '-' . (string) $context['season_name'] ),
			'description'          => sanitize_textarea_field( (string) ( $input['description'] ?? '' ) ),
			'status'               => sanitize_key( (string) ( $input['status'] ?? 'draft' ) ),
			'budget_cents'         => (int) ( $input['budgetCents'] ?? 100000 ),
			'squad_size'           => (int) ( $input['squadSize'] ?? 10 ),
			'starting_size'        => (int) ( $input['startingSize'] ?? 7 ),
			'bench_size'           => (int) ( $input['benchSize'] ?? 3 ),
			'max_players_per_team' => (int) ( $input['maxPlayersPerTeam'] ?? 3 ),
			'formation_rules_json' => wp_json_encode( $input['formationRules'] ?? array() ) ?: '{}',
			'created_by'           => $user_id,
			'updated_by'           => $user_id,
			'created_at'           => $now,
			'updated_at'           => $now,
		);
		$this->database->query( 'START TRANSACTION' );
		try {
			$row['id'] = $this->insert_or_fail( $this->database->prefix . 'instascore_fantasy_games', $row );
			$fantasy_season = array(
				'uuid'            => wp_generate_uuid4(),
				'fantasy_game_id' => (int) $row['id'],
				'season_id'       => (int) $context['season_id'],
				'name'            => (string) $context['season_name'],
				'status'          => 'active',
				'start_at'        => $context['start_date'] . ' 00:00:00',
				'end_at'          => $context['end_date'] . ' 23:59:59',
				'created_at'      => $now,
				'updated_at'      => $now,
			);
			$fantasy_season_id = $this->insert_or_fail( $this->database->prefix . 'instascore_fantasy_seasons', $fantasy_season );
			$this->insert_or_fail(
				$this->database->prefix . 'instascore_fantasy_gameweeks',
				array(
					'uuid'              => wp_generate_uuid4(),
					'fantasy_season_id' => $fantasy_season_id,
					'name'              => sanitize_text_field( (string) ( $input['gameweekName'] ?? 'Gameweek 1' ) ),
					'sequence_number'   => 1,
					'deadline_at'       => sanitize_text_field( (string) ( $input['deadlineAt'] ?? $context['start_date'] . ' 00:00:00' ) ),
					'status'            => 'open',
					'created_at'        => $now,
					'updated_at'        => $now,
				)
			);
			$position_ids = $this->create_default_positions( (int) $row['id'] );
			$this->populate_player_pool( (int) $row['id'], (int) $context['season_id'], $position_ids );
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
		$row['sport_uuid'] = $context['sport_uuid'];
		$row['sport_name'] = $context['sport_name'];
		$row['sport_slug'] = $context['sport_slug'];
		return $row;
	}

	private function competition_season_context( string $competition_uuid, string $season_uuid ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT se.id season_id,se.name season_name,se.start_date,se.end_date,c.id competition_id,
					s.id sport_id,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug
				FROM {$this->database->prefix}instascore_seasons se
				JOIN {$this->database->prefix}instascore_competitions c ON c.id = se.competition_id
				JOIN {$this->database->prefix}instascore_sports s ON s.id = c.sport_id
				WHERE c.uuid = %s AND se.uuid = %s AND c.status = 'active' AND se.status <> 'archived' LIMIT 1",
				$competition_uuid,
				$season_uuid
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	/** @return array<string,int> */
	private function create_default_positions( int $game_id ): array {
		$definitions = array(
			array( 'QB', 'Quarterback', 1, 2, 1, 1 ),
			array( 'REC', 'Receiver', 2, 5, 2, 4 ),
			array( 'RUSH', 'Rusher', 1, 2, 1, 2 ),
			array( 'DEF', 'Defender', 2, 5, 2, 4 ),
			array( 'FLEX', 'Flex', 0, 3, 0, 2 ),
		);
		$ids = array();
		foreach ( $definitions as $sort => $definition ) {
			$ids[ $definition[0] ] = $this->insert_or_fail(
				$this->database->prefix . 'instascore_fantasy_positions',
				array(
					'uuid'         => wp_generate_uuid4(),
					'fantasy_game_id' => $game_id,
					'code'         => $definition[0],
					'name'         => $definition[1],
					'min_squad'    => $definition[2],
					'max_squad'    => $definition[3],
					'min_starting' => $definition[4],
					'max_starting' => $definition[5],
					'sort_order'   => $sort + 1,
				)
			);
		}
		return $ids;
	}

	/** @param array<string,int> $position_ids */
	private function populate_player_pool( int $game_id, int $season_id, array $position_ids ): void {
		$registrations = $this->database->get_results(
			$this->database->prepare(
				"SELECT r.player_id,r.team_id,COALESCE(NULLIF(r.position_code,''),p.primary_position,'') position_code
				FROM {$this->database->prefix}instascore_team_registrations r
				JOIN {$this->database->prefix}instascore_players p ON p.id = r.player_id
				WHERE r.season_id = %d AND r.status = 'active' AND r.eligibility_status = 'eligible' AND p.status = 'active'",
				$season_id
			),
			ARRAY_A
		);
		foreach ( is_array( $registrations ) ? $registrations : array() as $registration ) {
			$code = $this->fantasy_position_code( (string) $registration['position_code'] );
			$this->insert_or_fail(
				$this->database->prefix . 'instascore_fantasy_players',
				array(
					'uuid'            => wp_generate_uuid4(),
					'fantasy_game_id' => $game_id,
					'player_id'       => (int) $registration['player_id'],
					'team_id'         => (int) $registration['team_id'],
					'position_id'     => $position_ids[ $code ],
					'price_cents'     => 7500,
					'status'          => 'available',
					'metadata_json'   => wp_json_encode( array( 'sourcePosition' => $registration['position_code'] ) ),
					'created_at'      => gmdate( 'Y-m-d H:i:s' ),
					'updated_at'      => gmdate( 'Y-m-d H:i:s' ),
				)
			);
		}
	}

	private function fantasy_position_code( string $position ): string {
		$position = strtoupper( trim( $position ) );
		if ( str_contains( $position, 'QB' ) || str_contains( $position, 'QUARTER' ) ) { return 'QB'; }
		if ( preg_match( '/WR|RECEIVER|CENTER|CENTRE|TE/', $position ) ) { return 'REC'; }
		if ( str_contains( $position, 'RUSH' ) || preg_match( '/(^|[^A-Z])RB([^A-Z]|$)/', $position ) ) { return 'RUSH'; }
		if ( preg_match( '/DB|CB|CORNER|SAFETY|LINEBACK|MLB|DEF/', $position ) ) { return 'DEF'; }
		return 'FLEX';
	}

	/** @param array<string,mixed> $data */
	private function insert_or_fail( string $table, array $data ): int {
		if ( false === $this->database->insert( $table, $data ) ) {
			throw new \RuntimeException( 'Fantasy data could not be saved.' );
		}
		return (int) $this->database->insert_id;
	}
}
