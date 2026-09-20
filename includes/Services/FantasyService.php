<?php
/**
 * Fantasy squad and administration service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\FantasyRepository;

final class FantasyService {
	public function __construct( private readonly FantasyRepository $repository ) {}

	public static function create(): self {
		global $wpdb;
		return new self( new FantasyRepository( $wpdb ) );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function games(): array {
		return array_map( array( $this, 'present_game' ), $this->repository->public_games() );
	}

	/** @return array<int,array<string,mixed>> */
	public function admin_games(): array {
		return array_map( array( $this, 'present_game' ), $this->repository->admin_games() );
	}

	public function game( string $uuid ): array {
		$game = $this->repository->find_game( $uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		return $this->present_game_with_rules( $game );
	}

	/** @return array<int,array<string,mixed>> */
	public function performance_table( string $game_uuid ): array {
		$game = $this->repository->find_game( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		return array_map(
			fn( array $row ): array => array(
				'gameweekUuid'    => $row['gameweek_uuid'],
				'gameweekName'    => $row['gameweek_name'],
				'sequenceNumber'  => (int) $row['sequence_number'],
				'rank'            => (int) $row['rank_position'],
				'previousRank'    => null === $row['previous_rank_position'] ? null : (int) $row['previous_rank_position'],
				'teamName'        => $row['team_name'] ?: 'Fantasy team',
				'managerName'     => $row['manager_name'] ?: 'Fantasy manager',
				'gameweekPoints'  => (int) $row['gameweek_points'],
				'totalPoints'     => (int) $row['season_points'],
				'status'          => $row['status'],
			),
			$this->repository->performance_table( (int) $game['id'] )
		);
	}

	/**
	 * @param array<string,mixed> $query Query.
	 * @return array<int,array<string,mixed>>
	 */
	public function player_pool( string $game_uuid, array $query = array() ): array {
		$game = $this->repository->find_game( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		return array_map( array( $this, 'present_player' ), $this->repository->player_pool( (int) $game['id'], $query ) );
	}

	/** @return array<string,mixed> */
	public function admin_player_pricing( string $game_uuid, array $query = array() ): array {
		$game = $this->repository->find_game( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		$query['limit'] = 1000;
		return array(
			'locked'  => $this->repository->submitted_squad_count( (int) $game['id'] ) > 0,
			'players' => array_map( array( $this, 'present_player' ), $this->repository->player_pool( (int) $game['id'], $query ) ),
		);
	}

	/** @param array<string,mixed> $input */
	public function update_player_prices( string $game_uuid, array $input ): array {
		$game = $this->repository->find_game( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		if ( $this->repository->submitted_squad_count( (int) $game['id'] ) > 0 ) {
			throw new ValidationException( array( 'prices' => 'locked_after_first_squad_submission' ) );
		}
		$rows = is_array( $input['updates'] ?? null ) ? $input['updates'] : array();
		if ( empty( $rows ) || count( $rows ) > 1000 ) {
			throw new ValidationException( array( 'updates' => 'one_to_1000_rows_required' ) );
		}
		$updates = array();
		foreach ( $rows as $index => $row ) {
			$uuid  = sanitize_text_field( (string) ( is_array( $row ) ? ( $row['fantasyPlayerUuid'] ?? '' ) : '' ) );
			$price = (int) ( is_array( $row ) ? ( $row['priceCents'] ?? 0 ) : 0 );
			if ( ! wp_is_uuid( $uuid ) || $price < 100 || $price > (int) $game['budget_cents'] ) {
				throw new ValidationException( array( 'updates.' . $index => 'valid_player_and_price_required' ) );
			}
			$updates[] = array( 'uuid' => $uuid, 'price_cents' => $price );
		}
		$known = $this->repository->fantasy_players_by_uuid( (int) $game['id'], array_column( $updates, 'uuid' ) );
		if ( count( $known ) !== count( array_unique( array_column( $updates, 'uuid' ) ) ) ) {
			throw new ValidationException( array( 'updates' => 'player_not_found_in_this_season' ) );
		}
		$this->repository->update_player_prices( (int) $game['id'], $updates );
		return $this->admin_player_pricing( $game_uuid );
	}

	public function current_squad( int $user_id, string $game_uuid ): array {
		$context = $this->context( $game_uuid );
		$squad  = $this->repository->squad_for_user( $user_id, (int) $context['game']['id'], (int) $context['gameweek']['id'] );
		return $this->present_squad( $context, $squad );
	}

	/**
	 * @param array<string,mixed> $input Squad input.
	 */
	public function save_squad( int $user_id, string $game_uuid, array $input, bool $submit = false ): array {
		$context = $this->context( $game_uuid );
		$squad   = $this->repository->squad_for_user( $user_id, (int) $context['game']['id'], (int) $context['gameweek']['id'] );
		$this->assert_deadline_open( $context['gameweek'] );
		$this->assert_revision( $squad, (int) ( $input['baseRevision'] ?? 0 ) );

		$entries = is_array( $input['players'] ?? null ) ? $input['players'] : array();
		$players = $this->repository->fantasy_players_by_uuid(
			(int) $context['game']['id'],
			array_values(
				array_filter(
					array_map(
						fn( $entry ): string => sanitize_text_field( (string) ( is_array( $entry ) ? ( $entry['fantasyPlayerUuid'] ?? '' ) : '' ) ),
						$entries
					)
				)
			)
		);
		$this->validate_squad( $context['game'], $context['positions'], $entries, $players, $submit );

		$next_revision = null === $squad ? 1 : ( (int) $squad['revision'] + 1 );
		$now           = gmdate( 'Y-m-d H:i:s' );
		$total         = array_sum( array_map( fn( array $player ): int => (int) $player['price_cents'], $players ) );
		$squad_row     = array(
			'id'                => $squad['id'] ?? null,
			'user_id'           => $user_id,
			'fantasy_game_id'   => (int) $context['game']['id'],
			'fantasy_season_id' => (int) $context['gameweek']['fantasy_season_id'],
			'gameweek_id'       => (int) $context['gameweek']['id'],
			'name'              => sanitize_text_field( (string) ( $input['name'] ?? 'My InstaScore Squad' ) ),
			'status'            => $submit ? 'submitted' : 'draft',
			'revision'          => $next_revision,
			'total_cost_cents'  => $total,
			'submitted_at'      => $submit ? $now : ( $squad['submitted_at'] ?? null ),
			'updated_at'        => $now,
		);
		$by_uuid       = array_column( $players, null, 'uuid' );
		$squad_entries = array();
		foreach ( $entries as $index => $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$uuid = sanitize_text_field( (string) ( $entry['fantasyPlayerUuid'] ?? '' ) );
			if ( ! isset( $by_uuid[ $uuid ] ) ) {
				continue;
			}
			$squad_entries[] = array(
				'fantasy_player_id' => (int) $by_uuid[ $uuid ]['id'],
				'slot_type'         => sanitize_key( (string) ( $entry['slotType'] ?? 'bench' ) ),
				'slot_number'       => (int) ( $entry['slotNumber'] ?? $index + 1 ),
				'is_captain'        => ! empty( $entry['isCaptain'] ) ? 1 : 0,
				'is_vice_captain'   => ! empty( $entry['isViceCaptain'] ) ? 1 : 0,
			);
		}

		$saved = $this->repository->save_squad(
			$squad_row,
			$squad_entries,
			array( 'input' => $input, 'totalCostCents' => $total ),
			$submit ? 'submit' : 'save'
		);
		return $this->present_squad( $context, $saved );
	}

	/**
	 * @param array<string,mixed> $input Admin input.
	 */
	public function create_game( array $input, int $user_id ): array {
		foreach ( array( 'competitionUuid', 'seasonUuid', 'name', 'deadlineAt' ) as $field ) {
			if ( empty( $input[ $field ] ) ) {
				throw new ValidationException( array( $field => 'required' ) );
			}
		}
		$squad_size    = (int) ( $input['squadSize'] ?? 10 );
		$starting_size = (int) ( $input['startingSize'] ?? 7 );
		$bench_size    = (int) ( $input['benchSize'] ?? 3 );
		$deadline      = strtotime( (string) $input['deadlineAt'] );
		$errors        = array();
		if ( $squad_size < 5 || $squad_size > 30 || $starting_size < 1 || $bench_size < 0 || $starting_size + $bench_size !== $squad_size ) {
			$errors['squadSize'] = 'starting_and_bench_must_equal_squad_size';
		}
		if ( (int) ( $input['budgetCents'] ?? 100000 ) < 1 ) {
			$errors['budgetCents'] = 'must_be_positive';
		}
		if ( false === $deadline || $deadline <= time() ) {
			$errors['deadlineAt'] = 'must_be_in_the_future';
		}
		if ( $errors ) {
			throw new ValidationException( $errors );
		}
		try {
			$created = $this->repository->create_game( $input, $user_id );
			FantasyScoringService::create()->seed_default_rules( (string) $created['uuid'] );
			return $this->present_game( $created );
		} catch ( \InvalidArgumentException $error ) {
			throw new ValidationException( array( 'seasonUuid' => 'not_found_for_competition' ) );
		}
	}

	/**
	 * Update editable fantasy game settings without changing its competition or season identity.
	 *
	 * @param array<string,mixed> $input Admin input.
	 */
	public function update_game( string $uuid, array $input, int $user_id ): array {
		$game = $this->repository->find_game( $uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}

		$name          = sanitize_text_field( (string) ( $input['name'] ?? $game['name'] ) );
		$status        = sanitize_key( (string) ( $input['status'] ?? $game['status'] ) );
		$squad_size    = (int) ( $input['squadSize'] ?? $game['squad_size'] );
		$starting_size = (int) ( $input['startingSize'] ?? $game['starting_size'] );
		$bench_size    = (int) ( $input['benchSize'] ?? $game['bench_size'] );
		$budget_cents  = (int) ( $input['budgetCents'] ?? $game['budget_cents'] );
		$team_limit    = (int) ( $input['maxPlayersPerTeam'] ?? $game['max_players_per_team'] );
		$errors        = array();

		if ( '' === $name ) {
			$errors['name'] = 'required';
		}
		if ( ! in_array( $status, array( 'draft', 'open', 'active' ), true ) ) {
			$errors['status'] = 'invalid';
		}
		if ( $squad_size < 5 || $squad_size > 30 || $starting_size < 1 || $bench_size < 0 || $starting_size + $bench_size !== $squad_size ) {
			$errors['squadSize'] = 'starting_and_bench_must_equal_squad_size';
		}
		if ( $budget_cents < 1 ) {
			$errors['budgetCents'] = 'must_be_positive';
		}
		if ( $team_limit < 1 || $team_limit > $squad_size ) {
			$errors['maxPlayersPerTeam'] = 'invalid';
		}
		if ( $errors ) {
			throw new ValidationException( $errors );
		}

		$updated = $this->repository->update_game(
			(int) $game['id'],
			array(
				'name'                 => $name,
				'description'          => sanitize_textarea_field( (string) ( $input['description'] ?? $game['description'] ?? '' ) ),
				'status'               => $status,
				'budget_cents'         => $budget_cents,
				'squad_size'           => $squad_size,
				'starting_size'        => $starting_size,
				'bench_size'           => $bench_size,
				'max_players_per_team' => $team_limit,
				'updated_by'           => $user_id,
				'updated_at'           => gmdate( 'Y-m-d H:i:s' ),
			)
		);

		return $this->present_game( $updated );
	}

	/** @return array<int,array<string,mixed>> */
	public function gameweeks( string $game_uuid ): array {
		$game = $this->repository->find_game( $game_uuid );
		if ( null === $game ) { throw new ValidationException( array( 'game' => 'not_found' ) ); }
		return array_map( array( $this, 'present_gameweek' ), $this->repository->gameweeks( (int) $game['id'] ) );
	}

	public function create_gameweek( string $game_uuid, array $input ): array {
		$game = $this->repository->find_game( $game_uuid );
		$deadline = strtotime( (string) ( $input['deadlineAt'] ?? '' ) );
		if ( null === $game || false === $deadline || $deadline <= time() ) { throw new ValidationException( array( 'deadlineAt' => 'future_deadline_required' ) ); }
		$name = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		if ( '' === $name ) { $name = 'Next gameweek'; }
		return $this->present_gameweek( $this->repository->create_gameweek( (int) $game['id'], $name, gmdate( 'Y-m-d H:i:s', $deadline ) ) );
	}

	public function change_gameweek_status( string $game_uuid, string $gameweek_uuid, string $status ): array {
		$allowed = array( 'scheduled', 'open', 'locked' );
		if ( ! in_array( $status, $allowed, true ) ) { throw new ValidationException( array( 'status' => 'invalid' ) ); }
		$game = $this->repository->find_game( $game_uuid );
		$row = null === $game ? null : $this->repository->set_gameweek_status( (int) $game['id'], $gameweek_uuid, $status );
		if ( null === $row ) { throw new ValidationException( array( 'gameweek' => 'not_found' ) ); }
		return $this->present_gameweek( $row );
	}

	private function present_gameweek( array $row ): array {
		return array( 'uuid' => $row['uuid'], 'name' => $row['name'], 'sequenceNumber' => (int) $row['sequence_number'], 'deadlineAt' => $row['deadline_at'], 'status' => $row['status'], 'locked' => 'locked' === $row['status'] || strtotime( (string) $row['deadline_at'] . ' UTC' ) <= time() );
	}

	/**
	 * @return array{game:array<string,mixed>,gameweek:array<string,mixed>,positions:array<int,array<string,mixed>>}
	 */
	private function context( string $game_uuid ): array {
		$game = $this->repository->find_game( $game_uuid );
		if ( null === $game ) {
			throw new ValidationException( array( 'game' => 'not_found' ) );
		}
		$gameweek = $this->repository->current_gameweek( (int) $game['id'] );
		if ( null === $gameweek ) {
			throw new ValidationException( array( 'gameweek' => 'missing' ) );
		}
		return array(
			'game'     => $game,
			'gameweek' => $gameweek,
			'positions'=> $this->repository->positions( (int) $game['id'] ),
		);
	}

	private function assert_deadline_open( array $gameweek ): void {
		if ( strtotime( (string) $gameweek['deadline_at'] ) <= time() ) {
			throw new ValidationException( array( 'deadline' => 'locked' ) );
		}
	}

	private function assert_revision( ?array $squad, int $base_revision ): void {
		if ( null !== $squad && $base_revision !== (int) $squad['revision'] ) {
			throw new ValidationException( array( 'revision' => 'conflict' ) );
		}
	}

	/**
	 * @param array<int,array<string,mixed>> $entries Input entries.
	 * @param array<int,array<string,mixed>> $players Matched players.
	 * @param array<int,array<string,mixed>> $positions Position rules.
	 */
	private function validate_squad( array $game, array $positions, array $entries, array $players, bool $submit ): void {
		$errors = array();
		if ( count( $entries ) !== count( array_unique( array_column( $entries, 'fantasyPlayerUuid' ) ) ) ) {
			$errors['players'] = 'duplicate';
		}
		if ( count( $entries ) !== count( $players ) ) {
			$errors['players'] = 'invalid_player';
		}
		if ( count( $entries ) > (int) $game['squad_size'] || ( $submit && count( $entries ) !== (int) $game['squad_size'] ) ) {
			$errors['squadSize'] = 'invalid';
		}
		$starting = array_values( array_filter( $entries, fn( $entry ): bool => is_array( $entry ) && 'starting' === ( $entry['slotType'] ?? '' ) ) );
		if ( count( $starting ) > (int) $game['starting_size'] || ( $submit && count( $starting ) !== (int) $game['starting_size'] ) ) {
			$errors['formation'] = 'invalid_starting_size';
		}
		$total = array_sum( array_map( fn( array $player ): int => (int) $player['price_cents'], $players ) );
		if ( $total > (int) $game['budget_cents'] ) {
			$errors['budget'] = 'exceeded';
		}
		$captains = array_filter( $entries, fn( $entry ): bool => is_array( $entry ) && ! empty( $entry['isCaptain'] ) );
		$vices    = array_filter( $entries, fn( $entry ): bool => is_array( $entry ) && ! empty( $entry['isViceCaptain'] ) );
		if ( $submit && ( 1 !== count( $captains ) || 1 !== count( $vices ) || ( $captains && $vices && reset( $captains ) === reset( $vices ) ) ) ) {
			$errors['captain'] = 'captain_and_vice_required';
		}
		foreach ( $players as $player ) {
			if ( 'available' !== ( $player['status'] ?? '' ) ) {
				$errors['availability'] = 'unavailable_player_selected';
			}
		}
		$team_counts = array_count_values( array_filter( array_map( fn( array $player ): int => (int) ( $player['team_id'] ?? 0 ), $players ) ) );
		foreach ( $team_counts as $count ) {
			if ( $count > (int) $game['max_players_per_team'] ) {
				$errors['teamLimit'] = 'exceeded';
			}
		}
		$player_positions = array_column( $players, 'position_code' );
		$position_counts  = array_count_values( $player_positions );
		$by_uuid          = array_column( $players, null, 'uuid' );
		$starting_counts  = array();
		foreach ( $starting as $entry ) {
			$uuid = (string) ( $entry['fantasyPlayerUuid'] ?? '' );
			if ( isset( $by_uuid[ $uuid ] ) ) {
				$code = (string) $by_uuid[ $uuid ]['position_code'];
				$starting_counts[ $code ] = ( $starting_counts[ $code ] ?? 0 ) + 1;
			}
		}
		foreach ( $positions as $position ) {
			$count = (int) ( $position_counts[ $position['code'] ] ?? 0 );
			if ( $submit && ( $count < (int) $position['min_squad'] || $count > (int) $position['max_squad'] ) ) {
				$errors[ 'position_' . $position['code'] ] = 'invalid_count';
			}
			$starting_count = (int) ( $starting_counts[ $position['code'] ] ?? 0 );
			if ( $submit && ( $starting_count < (int) $position['min_starting'] || $starting_count > (int) $position['max_starting'] ) ) {
				$errors[ 'startingPosition_' . $position['code'] ] = 'invalid_count';
			}
		}
		if ( $errors ) {
			throw new ValidationException( $errors );
		}
	}

	private function present_game( array $row ): array {
		return array(
			'uuid'              => $row['uuid'],
			'name'              => $row['name'],
			'slug'              => $row['slug'],
			'description'       => $row['description'] ?? '',
			'status'            => $row['status'],
			'budgetCents'       => (int) $row['budget_cents'],
			'squadSize'         => (int) $row['squad_size'],
			'startingSize'      => (int) $row['starting_size'],
			'benchSize'         => (int) $row['bench_size'],
			'maxPlayersPerTeam' => (int) $row['max_players_per_team'],
			'season'            => isset( $row['fantasy_season_uuid'] ) ? array( 'uuid' => $row['fantasy_season_uuid'], 'name' => $row['fantasy_season_name'] ) : null,
			'sport'             => array(
				'uuid' => $row['sport_uuid'] ?? '',
				'name' => $row['sport_name'] ?? '',
				'slug' => $row['sport_slug'] ?? '',
			),
		);
	}

	private function present_game_with_rules( array $row ): array {
		$game = $this->present_game( $row );
		$game['formationRules'] = json_decode( (string) $row['formation_rules_json'], true ) ?: array();
		$game['positions']      = array_map(
			fn( array $position ): array => array(
				'uuid'        => $position['uuid'],
				'code'        => $position['code'],
				'name'        => $position['name'],
				'minSquad'    => (int) $position['min_squad'],
				'maxSquad'    => (int) $position['max_squad'],
				'minStarting' => (int) $position['min_starting'],
				'maxStarting' => (int) $position['max_starting'],
			),
			$this->repository->positions( (int) $row['id'] )
		);
		return $game;
	}

	private function present_player( array $row ): array {
		$managers = max( 0, (int) ( $row['manager_count'] ?? 0 ) );
		return array(
			'uuid'       => $row['uuid'],
			'priceCents' => (int) $row['price_cents'],
			'status'     => $row['status'],
			'position'   => array( 'code' => $row['position_code'], 'name' => $row['position_name'] ),
			'player'     => array( 'uuid' => $row['player_uuid'], 'name' => $row['player_name'], 'photoUrl' => $row['photo_url'] ?? null ),
			'team'       => array( 'uuid' => $row['team_uuid'] ?? '', 'name' => $row['team_name'] ?? 'Free agent' ),
			'totalPoints'=> (int) ( $row['total_points'] ?? 0 ),
			'ownershipPercent' => 0 === $managers ? 0.0 : round( 100 * (int) ( $row['ownership_count'] ?? 0 ) / $managers, 1 ),
		);
	}

	private function present_squad( array $context, ?array $squad ): array {
		$players = null === $squad ? array() : array_map( array( $this, 'present_squad_player' ), $this->repository->squad_players( (int) $squad['id'] ) );
		return array(
			'game'       => $this->present_game_with_rules( $context['game'] ),
			'gameweek'   => array(
				'uuid'           => $context['gameweek']['uuid'],
				'name'           => $context['gameweek']['name'],
				'sequenceNumber' => (int) $context['gameweek']['sequence_number'],
				'deadlineAt'     => $context['gameweek']['deadline_at'],
				'locked'         => strtotime( (string) $context['gameweek']['deadline_at'] ) <= time(),
			),
			'squad'      => null === $squad ? null : array(
				'uuid'            => $squad['uuid'],
				'name'            => $squad['name'],
				'status'          => $squad['status'],
				'revision'        => (int) $squad['revision'],
				'totalCostCents'  => (int) $squad['total_cost_cents'],
				'remainingBudget' => max( 0, (int) $context['game']['budget_cents'] - (int) $squad['total_cost_cents'] ),
				'players'         => $players,
			),
		);
	}

	private function present_squad_player( array $row ): array {
		return array(
			'fantasyPlayerUuid' => $row['fantasy_player_uuid'],
			'slotType'          => $row['slot_type'],
			'slotNumber'        => (int) $row['slot_number'],
			'isCaptain'         => (bool) $row['is_captain'],
			'isViceCaptain'     => (bool) $row['is_vice_captain'],
			'priceCents'        => (int) $row['price_cents'],
			'position'          => array( 'code' => $row['position_code'], 'name' => $row['position_name'] ),
			'player'            => array( 'uuid' => $row['player_uuid'], 'name' => $row['player_name'] ),
			'team'              => array( 'uuid' => $row['team_uuid'] ?? '', 'name' => $row['team_name'] ?? 'Free agent' ),
		);
	}
}
