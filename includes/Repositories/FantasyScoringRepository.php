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

	/** @return array<int,array<string,mixed>> */
	public function rules_by_game_uuid( string $game_uuid ): array {
		$game = $this->game_by_uuid( $game_uuid );
		return null === $game ? array() : $this->rules_for_game( (int) $game['id'] );
	}

	/** @return array<int,array<string,mixed>> */
	public function contexts_for_fixture( int $fixture_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT g.id game_id,g.uuid game_uuid,g.sport_id,gw.id gameweek_id,gw.uuid gameweek_uuid,gw.status gameweek_status,
					fs.season_id,f.status fixture_status
				FROM {$this->database->prefix}instascore_fixtures f
				JOIN {$this->database->prefix}instascore_fantasy_seasons fs ON fs.season_id = f.season_id AND fs.status = 'active'
				JOIN {$this->database->prefix}instascore_fantasy_games g ON g.id = fs.fantasy_game_id AND g.status IN ('open','active')
				JOIN {$this->database->prefix}instascore_fantasy_gameweeks gw ON gw.fantasy_season_id = fs.id AND gw.status IN ('scheduled','open') AND gw.deadline_at <= f.kickoff_at
				WHERE f.id = %d AND NOT EXISTS (
					SELECT 1 FROM {$this->database->prefix}instascore_fantasy_gameweeks later
					WHERE later.fantasy_season_id = gw.fantasy_season_id AND later.status IN ('scheduled','open')
					AND later.deadline_at <= f.kickoff_at AND later.deadline_at > gw.deadline_at
				) ORDER BY gw.sequence_number DESC LIMIT 20",
				$fixture_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public function current_context_for_game( string $game_uuid ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT g.id game_id,g.uuid game_uuid,gw.id gameweek_id,gw.uuid gameweek_uuid,gw.status gameweek_status,gw.deadline_at,fs.season_id
				FROM {$this->database->prefix}instascore_fantasy_games g
				JOIN {$this->database->prefix}instascore_fantasy_seasons fs ON fs.fantasy_game_id = g.id AND fs.status = 'active'
				JOIN {$this->database->prefix}instascore_fantasy_gameweeks gw ON gw.fantasy_season_id = fs.id AND gw.status IN ('scheduled','open')
				WHERE g.uuid = %s ORDER BY gw.sequence_number ASC LIMIT 1",
				$game_uuid
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	/** @return int[] */
	public function fixture_ids_for_context( array $context ): array {
		$ids = $this->database->get_col(
			$this->database->prepare(
				"SELECT f.id FROM {$this->database->prefix}instascore_fixtures f
				WHERE f.season_id = %d AND f.status IN ('live','completed','confirmed') AND f.kickoff_at >= %s
				AND NOT EXISTS (
					SELECT 1 FROM {$this->database->prefix}instascore_fantasy_gameweeks next_gw
					JOIN {$this->database->prefix}instascore_fantasy_seasons next_fs ON next_fs.id = next_gw.fantasy_season_id
					WHERE next_fs.fantasy_game_id = %d AND next_gw.deadline_at > %s AND next_gw.deadline_at <= f.kickoff_at
				) ORDER BY f.kickoff_at ASC",
				(int) $context['season_id'], (string) $context['deadline_at'], (int) $context['game_id'], (string) $context['deadline_at']
			)
		);
		return array_map( 'intval', is_array( $ids ) ? $ids : array() );
	}

	/** @return array<int,array<string,mixed>> */
	public function events_for_fixture( int $fixture_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT * FROM {$this->database->prefix}instascore_match_events WHERE fixture_id = %d ORDER BY sequence_number ASC",
				$fixture_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/** @return array<int,array<string,mixed>> */
	public function fantasy_players_for_game( int $game_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT id,uuid,player_id FROM {$this->database->prefix}instascore_fantasy_players WHERE fantasy_game_id = %d",
				$game_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Persist a complete recalculation as immutable revisions.
	 *
	 * @param array<int,array<string,mixed>> $calculated Calculated event points.
	 */
	public function reconcile_points( array $context, int $fixture_id, array $calculated, int $user_id, string $reason ): array {
		$players       = array_column( $this->fantasy_players_for_game( (int) $context['game_id'] ), null, 'player_id' );
		$current_rows  = $this->latest_points_for_fixture( (int) $context['game_id'], (int) $context['gameweek_id'], $fixture_id );
		$current       = array();
		foreach ( $current_rows as $row ) {
			$current[ (int) $row['match_event_id'] . ':' . (int) $row['fantasy_player_id'] ] = $row;
		}
		$desired = array();
		foreach ( $calculated as $point ) {
			$player = $players[ (int) $point['playerId'] ] ?? null;
			if ( null === $player ) { continue; }
			$key = (int) $point['matchEventId'] . ':' . (int) $player['id'];
			$desired[ $key ] = array( 'point' => $point, 'player' => $player );
		}
		$created = 0;
		$this->database->query( 'START TRANSACTION' );
		try {
			foreach ( $desired as $key => $item ) {
				$before = $current[ $key ] ?? null;
				$point  = $item['point'];
				if ( null !== $before && (int) $before['points'] === (int) $point['points'] && (string) $before['status'] === (string) $point['status'] ) { continue; }
				$this->insert_point_revision( $context, $fixture_id, $item['player'], $point, $before, $user_id, $reason );
				++$created;
			}
			foreach ( array_diff_key( $current, $desired ) as $before ) {
				if ( 0 === (int) $before['points'] ) { continue; }
				$point = array(
					'playerId' => (int) $before['player_id'], 'matchEventId' => (int) $before['match_event_id'],
					'eventType' => 'reversed', 'points' => 0, 'ruleVersion' => (int) $before['rule_version'],
					'status' => 'provisional', 'breakdown' => array( 'type' => 'reversed', 'label' => 'Voided or corrected event', 'points' => 0 ),
				);
				$this->insert_point_revision( $context, $fixture_id, array( 'id' => $before['fantasy_player_id'] ), $point, $before, $user_id, $reason );
				++$created;
			}
			$this->rebuild_squad_totals( (int) $context['game_id'], (int) $context['gameweek_id'] );
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
		return array( 'revisionsCreated' => $created, 'eventsScored' => count( $desired ) );
	}

	public function finalize_gameweek( array $context, int $user_id, string $reason ): array {
		$gameweek_id = (int) $context['gameweek_id'];
		$this->database->query( 'START TRANSACTION' );
		try {
			$this->database->update( $this->database->prefix . 'instascore_fantasy_points', array( 'status' => 'confirmed', 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'gameweek_id' => $gameweek_id ) );
			$this->database->update( $this->database->prefix . 'instascore_fantasy_squad_totals', array( 'status' => 'confirmed', 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'gameweek_id' => $gameweek_id ) );
			$this->database->update( $this->database->prefix . 'instascore_fantasy_gameweeks', array( 'status' => 'completed', 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'id' => $gameweek_id ) );
			$this->database->insert( $this->database->prefix . 'instascore_fantasy_point_revisions', array(
				'uuid' => wp_generate_uuid4(), 'fantasy_point_id' => null, 'fantasy_game_id' => (int) $context['game_id'],
				'gameweek_id' => $gameweek_id, 'fantasy_player_id' => null, 'revision' => time(), 'action' => 'finalize_gameweek',
				'points_before' => null, 'points_after' => (int) $this->database->get_var( $this->database->prepare( "SELECT COALESCE(SUM(gameweek_points),0) FROM {$this->database->prefix}instascore_fantasy_squad_totals WHERE gameweek_id = %d", $gameweek_id ) ),
				'reason' => sanitize_textarea_field( $reason ), 'snapshot_json' => wp_json_encode( array( 'status' => 'confirmed' ) ),
				'created_by' => $user_id, 'created_at' => gmdate( 'Y-m-d H:i:s' ),
			) );
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) { $this->database->query( 'ROLLBACK' ); throw $error; }
		return array( 'gameweekUuid' => $context['gameweek_uuid'], 'status' => 'confirmed' );
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
				AND NOT EXISTS (SELECT 1 FROM {$this->database->prefix}instascore_fantasy_points newer WHERE newer.match_event_id = fp.match_event_id AND newer.fantasy_player_id = fp.fantasy_player_id AND newer.revision > fp.revision)
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
				AND NOT EXISTS (SELECT 1 FROM {$this->database->prefix}instascore_fantasy_points newer WHERE newer.match_event_id = fp.match_event_id AND newer.fantasy_player_id = fp.fantasy_player_id AND newer.revision > fp.revision)
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
		if ( false === $this->database->insert( $this->database->prefix . 'instascore_fantasy_transfers', $row ) ) {
			throw new \RuntimeException( 'Fantasy transfer could not be saved.' );
		}
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

	public function transfer_context( int $user_id, string $game_uuid ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT g.id game_id,g.budget_cents,g.max_players_per_team,gw.id gameweek_id,gw.deadline_at,sq.id squad_id,sq.revision,sq.total_cost_cents
				FROM {$this->database->prefix}instascore_fantasy_games g
				JOIN {$this->database->prefix}instascore_fantasy_seasons fs ON fs.fantasy_game_id = g.id AND fs.status = 'active'
				JOIN {$this->database->prefix}instascore_fantasy_gameweeks gw ON gw.fantasy_season_id = fs.id AND gw.status IN ('scheduled','open')
				JOIN {$this->database->prefix}instascore_fantasy_squads sq ON sq.fantasy_game_id = g.id AND sq.gameweek_id = gw.id AND sq.user_id = %d AND sq.status = 'submitted'
				WHERE g.uuid = %s ORDER BY gw.sequence_number ASC LIMIT 1",
				$user_id, $game_uuid
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	public function fantasy_player_by_uuid( int $game_id, string $uuid ): ?array {
		$row = $this->database->get_row( $this->database->prepare(
			"SELECT fp.*,pos.code position_code,p.display_name player_name FROM {$this->database->prefix}instascore_fantasy_players fp
			JOIN {$this->database->prefix}instascore_fantasy_positions pos ON pos.id = fp.position_id
			JOIN {$this->database->prefix}instascore_players p ON p.id = fp.player_id
			WHERE fp.fantasy_game_id = %d AND fp.uuid = %s LIMIT 1", $game_id, $uuid
		), ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function squad_player( int $squad_id, int $fantasy_player_id ): ?array {
		$row = $this->database->get_row( $this->database->prepare(
			"SELECT sp.*,fp.price_cents,fp.team_id,pos.code position_code FROM {$this->database->prefix}instascore_fantasy_squad_players sp
			JOIN {$this->database->prefix}instascore_fantasy_players fp ON fp.id = sp.fantasy_player_id
			JOIN {$this->database->prefix}instascore_fantasy_positions pos ON pos.id = fp.position_id
			WHERE sp.squad_id = %d AND sp.fantasy_player_id = %d LIMIT 1", $squad_id, $fantasy_player_id
		), ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	public function team_count_in_squad( int $squad_id, int $team_id, int $except_player_id ): int {
		return (int) $this->database->get_var( $this->database->prepare(
			"SELECT COUNT(*) FROM {$this->database->prefix}instascore_fantasy_squad_players sp JOIN {$this->database->prefix}instascore_fantasy_players fp ON fp.id = sp.fantasy_player_id WHERE sp.squad_id = %d AND fp.team_id = %d AND fp.id <> %d",
			$squad_id, $team_id, $except_player_id
		) );
	}

	public function apply_transfer( array $context, array $out, array $incoming, int $user_id, int $cost_points ): array {
		$now = gmdate( 'Y-m-d H:i:s' );
		$this->database->query( 'START TRANSACTION' );
		try {
			$player_updated = $this->database->update( $this->database->prefix . 'instascore_fantasy_squad_players', array( 'fantasy_player_id' => (int) $incoming['id'] ), array( 'id' => (int) $out['id'] ) );
			if ( false === $player_updated || 1 !== $player_updated ) {
				throw new \RuntimeException( 'Fantasy transfer player update failed.' );
			}
			$squad_updated = $this->database->update( $this->database->prefix . 'instascore_fantasy_squads', array(
				'total_cost_cents' => (int) $context['total_cost_cents'] - (int) $out['price_cents'] + (int) $incoming['price_cents'],
				'revision' => (int) $context['revision'] + 1, 'updated_at' => $now,
			), array( 'id' => (int) $context['squad_id'], 'revision' => (int) $context['revision'] ) );
			if ( false === $squad_updated || 1 !== $squad_updated ) {
				throw new \RuntimeException( 'Fantasy squad was updated elsewhere.' );
			}
			$row = $this->create_transfer( array(
				'user_id' => $user_id, 'fantasy_game_id' => (int) $context['game_id'], 'gameweek_id' => (int) $context['gameweek_id'],
				'squad_id' => (int) $context['squad_id'], 'out_fantasy_player_id' => (int) $out['fantasy_player_id'],
				'in_fantasy_player_id' => (int) $incoming['id'], 'cost_points' => $cost_points,
				'free_transfer_used' => 0 === $cost_points ? 1 : 0, 'status' => 'completed', 'revision' => (int) $context['revision'] + 1,
			) );
			$history_created = $this->database->insert( $this->database->prefix . 'instascore_fantasy_squad_history', array(
				'uuid' => wp_generate_uuid4(), 'squad_id' => (int) $context['squad_id'], 'user_id' => $user_id,
				'revision' => (int) $context['revision'] + 1, 'action' => 'transfer',
				'snapshot_json' => wp_json_encode( array( 'out' => $out['fantasy_player_id'], 'in' => $incoming['id'], 'costPoints' => $cost_points ) ), 'created_at' => $now,
			) );
			if ( false === $history_created ) {
				throw new \RuntimeException( 'Fantasy squad history could not be saved.' );
			}
			$this->database->query( 'COMMIT' );
			return $row;
		} catch ( \Throwable $error ) { $this->database->query( 'ROLLBACK' ); throw $error; }
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

	public function league_by_invite_code( string $code ): ?array {
		$row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->database->prefix}instascore_fantasy_leagues WHERE invite_code = %s AND status = 'active' LIMIT 1", strtoupper( $code ) ), ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	/** @return array<int,array<string,mixed>> */
	public function leagues_for_user( int $user_id, int $game_id ): array {
		$rows = $this->database->get_results( $this->database->prepare(
			"SELECT l.* FROM {$this->database->prefix}instascore_fantasy_leagues l
			LEFT JOIN {$this->database->prefix}instascore_fantasy_league_members m ON m.league_id = l.id AND m.user_id = %d AND m.status = 'active'
			WHERE l.fantasy_game_id = %d AND l.status = 'active' AND (l.visibility = 'public' OR m.id IS NOT NULL)
			ORDER BY (m.id IS NOT NULL) DESC,l.name ASC", $user_id, $game_id
		), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
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
				JOIN {$this->database->prefix}instascore_fantasy_leagues l ON l.id = m.league_id
				LEFT JOIN {$this->database->prefix}instascore_fantasy_squads sq ON sq.user_id = m.user_id AND sq.fantasy_game_id = l.fantasy_game_id
				LEFT JOIN {$this->database->prefix}instascore_fantasy_squad_totals t ON t.squad_id = sq.id
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

	/** @return array<int,array<string,mixed>> */
	private function latest_points_for_fixture( int $game_id, int $gameweek_id, int $fixture_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT fp.* FROM {$this->database->prefix}instascore_fantasy_points fp
				WHERE fp.fantasy_game_id = %d AND fp.gameweek_id = %d AND fp.fixture_id = %d
				AND NOT EXISTS (SELECT 1 FROM {$this->database->prefix}instascore_fantasy_points newer
					WHERE newer.match_event_id = fp.match_event_id AND newer.fantasy_player_id = fp.fantasy_player_id AND newer.revision > fp.revision)",
				$game_id, $gameweek_id, $fixture_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	private function insert_point_revision( array $context, int $fixture_id, array $player, array $point, ?array $before, int $user_id, string $reason ): void {
		$revision = null === $before ? 1 : (int) $before['revision'] + 1;
		$now      = gmdate( 'Y-m-d H:i:s' );
		$row      = array(
			'uuid' => wp_generate_uuid4(), 'fantasy_game_id' => (int) $context['game_id'], 'gameweek_id' => (int) $context['gameweek_id'],
			'fixture_id' => $fixture_id, 'match_event_id' => (int) $point['matchEventId'], 'fantasy_player_id' => (int) $player['id'],
			'player_id' => (int) $point['playerId'], 'points' => (int) $point['points'], 'status' => (string) $point['status'],
			'rule_version' => (int) $point['ruleVersion'], 'breakdown_json' => wp_json_encode( $point['breakdown'] ) ?: '{}',
			'revision' => $revision, 'created_at' => $now, 'updated_at' => $now,
		);
		if ( false === $this->database->insert( $this->database->prefix . 'instascore_fantasy_points', $row ) ) {
			throw new \RuntimeException( 'Fantasy points could not be saved.' );
		}
		$point_id = (int) $this->database->insert_id;
		$this->database->insert( $this->database->prefix . 'instascore_fantasy_point_revisions', array(
			'uuid' => wp_generate_uuid4(), 'fantasy_point_id' => $point_id, 'fantasy_game_id' => (int) $context['game_id'],
			'gameweek_id' => (int) $context['gameweek_id'], 'fantasy_player_id' => (int) $player['id'], 'revision' => $revision,
			'action' => null === $before ? 'calculated' : 'recalculated', 'points_before' => null === $before ? null : (int) $before['points'],
			'points_after' => (int) $point['points'], 'reason' => sanitize_textarea_field( $reason ),
			'snapshot_json' => wp_json_encode( $row ) ?: '{}', 'created_by' => $user_id, 'created_at' => $now,
		) );
	}

	private function rebuild_squad_totals( int $game_id, int $gameweek_id ): void {
		$squads = $this->database->get_results(
			$this->database->prepare( "SELECT id,user_id FROM {$this->database->prefix}instascore_fantasy_squads WHERE fantasy_game_id = %d AND gameweek_id = %d AND status = 'submitted'", $game_id, $gameweek_id ),
			ARRAY_A
		);
		foreach ( is_array( $squads ) ? $squads : array() as $squad ) {
			$points = (int) $this->database->get_var( $this->database->prepare(
				"SELECT COALESCE(SUM(latest.points),0) + CASE
				WHEN EXISTS (SELECT 1 FROM {$this->database->prefix}instascore_fantasy_squad_players captain JOIN {$this->database->prefix}instascore_fantasy_points cp ON cp.fantasy_player_id = captain.fantasy_player_id AND cp.gameweek_id = %d WHERE captain.squad_id = %d AND captain.is_captain = 1) THEN COALESCE(SUM(CASE WHEN sp.is_captain = 1 THEN latest.points ELSE 0 END),0)
				ELSE COALESCE(SUM(CASE WHEN sp.is_vice_captain = 1 THEN latest.points ELSE 0 END),0) END
				FROM {$this->database->prefix}instascore_fantasy_squad_players sp
				JOIN {$this->database->prefix}instascore_fantasy_points latest ON latest.fantasy_player_id = sp.fantasy_player_id AND latest.gameweek_id = %d
				WHERE sp.squad_id = %d AND sp.slot_type = 'starting'
				AND NOT EXISTS (SELECT 1 FROM {$this->database->prefix}instascore_fantasy_points newer WHERE newer.match_event_id = latest.match_event_id AND newer.fantasy_player_id = latest.fantasy_player_id AND newer.revision > latest.revision)",
				$gameweek_id, (int) $squad['id'], $gameweek_id, (int) $squad['id']
			) );
			$transfer_cost = (int) $this->database->get_var( $this->database->prepare( "SELECT COALESCE(SUM(cost_points),0) FROM {$this->database->prefix}instascore_fantasy_transfers WHERE squad_id = %d AND gameweek_id = %d AND status = 'completed'", (int) $squad['id'], $gameweek_id ) );
			$existing = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->database->prefix}instascore_fantasy_squad_totals WHERE squad_id = %d AND gameweek_id = %d LIMIT 1", (int) $squad['id'], $gameweek_id ), ARRAY_A );
			$gameweek_points = $points - $transfer_cost;
			$prior_points = (int) $this->database->get_var( $this->database->prepare( "SELECT COALESCE(SUM(gameweek_points),0) FROM {$this->database->prefix}instascore_fantasy_squad_totals WHERE user_id = %d AND gameweek_id <> %d AND status = 'confirmed'", (int) $squad['user_id'], $gameweek_id ) );
			$row = array( 'gameweek_points' => $gameweek_points, 'season_points' => $prior_points + $gameweek_points, 'revision' => is_array( $existing ) ? (int) $existing['revision'] + 1 : 1, 'status' => 'provisional', 'updated_at' => gmdate( 'Y-m-d H:i:s' ) );
			if ( is_array( $existing ) ) {
				$this->database->update( $this->database->prefix . 'instascore_fantasy_squad_totals', $row, array( 'id' => (int) $existing['id'] ) );
			} else {
				$this->database->insert( $this->database->prefix . 'instascore_fantasy_squad_totals', array_merge( $row, array( 'uuid' => wp_generate_uuid4(), 'squad_id' => (int) $squad['id'], 'gameweek_id' => $gameweek_id, 'user_id' => (int) $squad['user_id'], 'rank_position' => null, 'previous_rank_position' => null ) ) );
			}
		}
		$ranked = $this->database->get_results( $this->database->prepare( "SELECT id,rank_position FROM {$this->database->prefix}instascore_fantasy_squad_totals WHERE gameweek_id = %d ORDER BY season_points DESC,gameweek_points DESC,user_id ASC", $gameweek_id ), ARRAY_A );
		foreach ( is_array( $ranked ) ? $ranked : array() as $index => $total ) {
			$this->database->update( $this->database->prefix . 'instascore_fantasy_squad_totals', array( 'previous_rank_position' => $total['rank_position'], 'rank_position' => $index + 1 ), array( 'id' => (int) $total['id'] ) );
		}
	}
}
