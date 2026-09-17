<?php
/**
 * Fantasy scoring, transfers and league service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Fantasy\FantasyRuleEngine;
use InstaScore\Platform\Repositories\FantasyScoringRepository;

final class FantasyScoringService {
	public function __construct( private readonly FantasyScoringRepository $repository ) {}

	public static function create(): self {
		global $wpdb;
		return new self( new FantasyScoringRepository( $wpdb ) );
	}

	public function points_breakdown( int $user_id, string $game_uuid ): array {
		return array_map(
			fn( array $row ): array => array(
				'uuid'       => $row['uuid'],
				'playerName' => $row['player_name'],
				'points'     => (int) $row['points'],
				'status'     => $row['status'],
				'revision'   => (int) $row['revision'],
				'breakdown'  => json_decode( (string) $row['breakdown_json'], true ) ?: array(),
				'updatedAt'  => $row['updated_at'],
			),
			$this->repository->points_breakdown( $user_id, $game_uuid )
		);
	}

	public function live_tracker( string $game_uuid ): array {
		return array_map(
			fn( array $row ): array => array(
				'playerName' => $row['player_name'],
				'points'     => (int) $row['points'],
				'status'     => $row['status'],
			),
			$this->repository->live_tracker( $game_uuid )
		);
	}

	public function create_rule( string $game_uuid, array $input ): array {
		$game = $this->repository->game_by_uuid( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		foreach ( array( 'sportSlug', 'eventType', 'points' ) as $field ) {
			if ( ! isset( $input[ $field ] ) ) {
				throw new ValidationException( array( $field => 'required' ) );
			}
		}
		$input['fantasy_game_id'] = (int) $game['id'];
		$row = $this->repository->create_rule( $input );
		return array(
			'uuid'          => $row['uuid'],
			'sportSlug'     => $row['sport_slug'],
			'eventType'     => $row['event_type'],
			'points'        => (int) $row['points'],
			'version'       => (int) $row['version'],
			'effectiveFrom' => $row['effective_from'],
		);
	}

	/** @return array<int,array<string,mixed>> */
	public function rules( string $game_uuid ): array {
		if ( null === $this->repository->game_by_uuid( $game_uuid ) ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		return array_map( array( $this, 'present_rule' ), $this->repository->rules_by_game_uuid( $game_uuid ) );
	}

	/** @return array<int,array<string,mixed>> */
	public function seed_default_rules( string $game_uuid ): array {
		$game = $this->repository->game_by_uuid( $game_uuid );
		if ( null === $game ) { throw new ValidationException( array( 'game' => 'not_found' ) ); }
		$existing = array_column( $this->repository->rules_for_game( (int) $game['id'] ), 'event_type' );
		foreach ( $this->default_flag_rules() as $rule ) {
			if ( in_array( $rule['eventType'], $existing, true ) ) { continue; }
			$rule['fantasy_game_id'] = (int) $game['id'];
			$this->repository->create_rule( $rule );
		}
		return $this->rules( $game_uuid );
	}

	public function recalculate_game( string $game_uuid, int $user_id, string $reason = 'Manual fantasy recalculation' ): array {
		$context = $this->repository->current_context_for_game( $game_uuid );
		if ( null === $context ) { throw new ValidationException( array( 'gameweek' => 'no_open_gameweek' ) ); }
		$total = array( 'fixturesProcessed' => 0, 'eventsScored' => 0, 'revisionsCreated' => 0 );
		foreach ( $this->repository->fixture_ids_for_context( $context ) as $fixture_id ) {
			$result = $this->recalculate_context_fixture( $context, $fixture_id, $user_id, $reason );
			++$total['fixturesProcessed'];
			$total['eventsScored'] += $result['eventsScored'];
			$total['revisionsCreated'] += $result['revisionsCreated'];
		}
		return array_merge( $total, array( 'status' => 'provisional', 'gameweekUuid' => $context['gameweek_uuid'] ) );
	}

	public function recalculate_fixture( int $fixture_id, int $user_id = 0, string $reason = 'Match event update' ): array {
		$results = array();
		foreach ( $this->repository->contexts_for_fixture( $fixture_id ) as $context ) {
			$results[] = $this->recalculate_context_fixture( $context, $fixture_id, $user_id, $reason );
		}
		return $results;
	}

	public function finalize_gameweek( string $game_uuid, int $user_id, string $reason ): array {
		if ( '' === trim( $reason ) ) { throw new ValidationException( array( 'reason' => 'required' ) ); }
		$context = $this->repository->current_context_for_game( $game_uuid );
		if ( null === $context ) { throw new ValidationException( array( 'gameweek' => 'no_open_gameweek' ) ); }
		$this->recalculate_game( $game_uuid, $user_id, 'Pre-finalisation recalculation: ' . $reason );
		return $this->repository->finalize_gameweek( $context, $user_id, $reason );
	}

	public function make_transfer( int $user_id, string $game_uuid, array $input ): array {
		$context = $this->repository->transfer_context( $user_id, $game_uuid );
		if ( null === $context ) {
			throw new ValidationException( array( 'squad' => 'submitted_squad_required' ) );
		}
		if ( (int) ( $input['baseRevision'] ?? 0 ) !== (int) $context['revision'] ) {
			throw new ValidationException( array( 'revision' => 'conflict' ) );
		}
		if ( empty( $input['outFantasyPlayerUuid'] ) || empty( $input['inFantasyPlayerUuid'] ) ) {
			throw new ValidationException( array( 'transfer' => 'missing_required_fields' ) );
		}
		if ( strtotime( (string) $context['deadline_at'] . ' UTC' ) <= time() ) {
			throw new ValidationException( array( 'deadline' => 'locked' ) );
		}
		$out_player = $this->repository->fantasy_player_by_uuid( (int) $context['game_id'], sanitize_text_field( (string) $input['outFantasyPlayerUuid'] ) );
		$incoming   = $this->repository->fantasy_player_by_uuid( (int) $context['game_id'], sanitize_text_field( (string) $input['inFantasyPlayerUuid'] ) );
		$out         = null === $out_player ? null : $this->repository->squad_player( (int) $context['squad_id'], (int) $out_player['id'] );
		if ( null === $out || null === $incoming || 'available' !== $incoming['status'] ) {
			throw new ValidationException( array( 'transfer' => 'invalid_player_selection' ) );
		}
		if ( null !== $this->repository->squad_player( (int) $context['squad_id'], (int) $incoming['id'] ) ) {
			throw new ValidationException( array( 'transfer' => 'incoming_player_already_selected' ) );
		}
		if ( (string) $out['position_code'] !== (string) $incoming['position_code'] ) {
			throw new ValidationException( array( 'position' => 'replacement_must_match_position' ) );
		}
		$new_cost = (int) $context['total_cost_cents'] - (int) $out['price_cents'] + (int) $incoming['price_cents'];
		if ( $new_cost > (int) $context['budget_cents'] ) {
			throw new ValidationException( array( 'budget' => 'exceeded' ) );
		}
		if ( $this->repository->team_count_in_squad( (int) $context['squad_id'], (int) $incoming['team_id'], (int) $out['fantasy_player_id'] ) >= (int) $context['max_players_per_team'] ) {
			throw new ValidationException( array( 'teamLimit' => 'exceeded' ) );
		}
		$transfer_count = $this->repository->completed_transfer_count( $user_id, (int) $context['game_id'], (int) $context['gameweek_id'] );
		$cost_points    = 0 === $transfer_count ? 0 : 4;
		$row            = $this->repository->apply_transfer( $context, $out, $incoming, $user_id, $cost_points );
		return array(
			'uuid'             => $row['uuid'],
			'costPoints'       => (int) $row['cost_points'],
			'freeTransferUsed' => (bool) $row['free_transfer_used'],
			'status'           => $row['status'],
			'outPlayerName'    => $out_player['player_name'],
			'inPlayerName'     => $incoming['player_name'],
		);
	}

	public function create_league( int $user_id, string $game_uuid, array $input ): array {
		$game = $this->repository->game_by_uuid( $game_uuid );
		if ( null === $game || empty( $input['name'] ) ) {
			throw new ValidationException( array( 'league' => 'invalid' ) );
		}
		$row = $this->repository->create_league(
			array(
				'fantasy_game_id' => (int) $game['id'],
				'name'            => sanitize_text_field( (string) $input['name'] ),
				'visibility'      => 'private' === ( $input['visibility'] ?? 'public' ) ? 'private' : 'public',
				'status'          => 'active',
				'created_by'      => $user_id,
			)
		);
		$this->repository->join_league( (int) $row['id'], $user_id );
		return $this->present_league( $row, true );
	}

	public function league( int $user_id, string $league_uuid ): array {
		$league = $this->repository->league_by_uuid( $league_uuid );
		if ( null === $league ) {
			throw new ValidationException( array( 'league' => 'not_found' ) );
		}
		$is_member = $this->repository->is_member( (int) $league['id'], $user_id );
		if ( 'private' === $league['visibility'] && ! $is_member ) {
			throw new ValidationException( array( 'league' => 'private_membership_required' ) );
		}
		$table = array();
		$rank  = 1;
		foreach ( $this->repository->league_table( (int) $league['id'] ) as $row ) {
			$previous = null === $row['previous_rank'] ? $rank : (int) $row['previous_rank'];
			$table[]  = array(
				'rank'         => $rank,
				'previousRank' => $previous,
				'movement'     => $previous - $rank,
				'userName'     => $row['display_name'] ?: 'Fantasy manager',
				'points'       => (int) $row['points'],
			);
			++$rank;
		}
		$league_data          = $this->present_league( $league, $is_member );
		$league_data['table'] = $table;
		return $league_data;
	}

	public function admin_override( int $user_id, string $game_uuid, array $input ): array {
		$game = $this->repository->game_by_uuid( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		$row = $this->repository->record_override(
			(int) $game['id'],
			(int) ( $input['gameweekId'] ?? 0 ),
			(int) ( $input['points'] ?? 0 ),
			(string) ( $input['reason'] ?? 'Administrative correction' ),
			$user_id
		);
		do_action( 'instascore_fantasy_points_overridden', $row );
		return array( 'uuid' => $row['uuid'], 'action' => $row['action'], 'pointsAfter' => (int) $row['points_after'] );
	}

	public function notification_foundation( string $type, string $game_uuid ): array {
		return array(
			'eventUuid'   => wp_generate_uuid4(),
			'eventType'   => sanitize_key( $type ),
			'category'    => 'fantasy_deadline' === $type ? 'fantasy_deadline' : 'fantasy_points_update',
			'collapseKey' => 'fantasy_' . sanitize_key( $type ) . '_' . str_replace( '-', '', $game_uuid ),
			'noisy'       => false,
			'queued'      => false,
			'policy'      => 'Queue only for deadline reminders, meaningful point recalculations or league rank movement.',
		);
	}

	private function present_league( array $row, bool $is_member ): array {
		return array(
			'uuid'       => $row['uuid'],
			'name'       => $row['name'],
			'visibility' => $row['visibility'],
			'inviteCode' => $is_member ? ( $row['invite_code'] ?? null ) : null,
			'isMember'   => $is_member,
			'status'     => $row['status'],
		);
	}

	private function present_rule( array $row ): array {
		return array(
			'uuid' => $row['uuid'], 'sportSlug' => $row['sport_slug'], 'eventType' => $row['event_type'],
			'points' => (int) $row['points'], 'version' => (int) $row['version'], 'status' => $row['status'],
			'effectiveFrom' => $row['effective_from'], 'conditions' => json_decode( (string) ( $row['conditions_json'] ?? '{}' ), true ) ?: array(),
		);
	}

	private function recalculate_context_fixture( array $context, int $fixture_id, int $user_id, string $reason ): array {
		$rules  = $this->repository->rules_for_game( (int) $context['game_id'] );
		$events = $this->repository->events_for_fixture( $fixture_id );
		$status = 'confirmed' === ( $context['fixture_status'] ?? '' ) ? 'confirmed' : 'provisional';
		$points = ( new FantasyRuleEngine() )->calculate_player_points( $events, $rules, $status );
		return $this->repository->reconcile_points( $context, $fixture_id, $points, $user_id, $reason );
	}

	/** @return array<int,array<string,mixed>> */
	private function default_flag_rules(): array {
		$effective = gmdate( 'Y-m-d H:i:s' );
		return array(
			array( 'sportSlug' => 'flag-football', 'eventType' => 'touchdown', 'points' => 6, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'passing_touchdown', 'points' => 4, 'effectiveFrom' => $effective, 'conditions' => array( 'secondaryPoints' => 6, 'secondaryLabel' => 'Touchdown reception' ) ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'rushing_touchdown', 'points' => 6, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'receiving_touchdown', 'points' => 6, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'one_point_conversion', 'points' => 1, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'two_point_conversion', 'points' => 2, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'interception', 'points' => 5, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'safety', 'points' => 4, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'flag_pull', 'points' => 1, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'player_of_the_match', 'points' => 5, 'effectiveFrom' => $effective ),
			array( 'sportSlug' => 'flag-football', 'eventType' => 'penalty', 'points' => -1, 'effectiveFrom' => $effective ),
		);
	}
}
