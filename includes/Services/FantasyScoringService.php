<?php
/**
 * Fantasy scoring, transfers and league service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
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

	public function make_transfer( int $user_id, string $game_uuid, array $input ): array {
		$game = $this->repository->game_by_uuid( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		if ( empty( $input['gameweekId'] ) || empty( $input['squadId'] ) || empty( $input['inFantasyPlayerId'] ) ) {
			throw new ValidationException( array( 'transfer' => 'missing_required_fields' ) );
		}
		$gameweek_id = (int) $input['gameweekId'];
		$deadline    = $this->repository->gameweek_deadline( $gameweek_id );
		if ( null !== $deadline && strtotime( $deadline . ' UTC' ) <= time() ) {
			throw new ValidationException( array( 'deadline' => 'locked' ) );
		}
		$transfer_count = $this->repository->completed_transfer_count( $user_id, (int) $game['id'], $gameweek_id );
		$free_used      = 0 === $transfer_count ? 1 : 0;
		$row       = $this->repository->create_transfer(
			array(
				'user_id'                => $user_id,
				'fantasy_game_id'        => (int) $game['id'],
				'gameweek_id'            => $gameweek_id,
				'squad_id'               => (int) $input['squadId'],
				'out_fantasy_player_id'  => empty( $input['outFantasyPlayerId'] ) ? null : (int) $input['outFantasyPlayerId'],
				'in_fantasy_player_id'   => (int) $input['inFantasyPlayerId'],
				'cost_points'            => $free_used ? 0 : 4,
				'free_transfer_used'     => $free_used,
				'status'                 => 'completed',
				'revision'               => (int) ( $input['baseRevision'] ?? 1 ),
			)
		);
		return array(
			'uuid'             => $row['uuid'],
			'costPoints'       => (int) $row['cost_points'],
			'freeTransferUsed' => (bool) $row['free_transfer_used'],
			'status'           => $row['status'],
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
}
