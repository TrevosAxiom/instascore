<?php
/**
 * Standings, statistics and discipline service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\StandingsCalculator;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\BaseRepository;
use InstaScore\Platform\Repositories\DisciplineRepository;
use InstaScore\Platform\Repositories\StandingsRepository;
use InstaScore\Platform\Repositories\StatisticsRepository;
use wpdb;

final class StandingsService {
	public function __construct(
		private readonly wpdb $database,
		private readonly StandingsCalculator $calculator
	) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb, new StandingsCalculator() );
	}

	public function rebuild_for_fixture_uuid( string $fixture_uuid, string $reason = 'fixture_result_changed' ): array {
		$fixture = $this->fixture_scope( $fixture_uuid );
		return $this->rebuild_scope( (int) $fixture['competition_id'], (int) $fixture['season_id'], null === $fixture['stage_id'] ? null : (int) $fixture['stage_id'], null === $fixture['group_id'] ? null : (int) $fixture['group_id'], $reason );
	}

	public function rebuild_scope( int $competition_id, int $season_id, ?int $stage_id = null, ?int $group_id = null, string $reason = 'manual_rebuild' ): array {
		$fixtures = $this->confirmed_fixtures( $competition_id, $season_id, $stage_id, $group_id );
		$rules    = $this->competition_rules( $competition_id );
		$result   = $this->calculator->calculate( $fixtures, $rules );
		$this->database->query( 'START TRANSACTION' );
		try {
			( new StandingsRepository( $this->database ) )->replace_scope( $competition_id, $season_id, $stage_id, $group_id, $result['standings'], $result['hash'] );
			( new StandingsRepository( $this->database ) )->snapshot( $competition_id, $season_id, $stage_id, $group_id, $result['standings'], $result['hash'] );
			( new StatisticsRepository( $this->database ) )->replace_team_stats( $competition_id, $season_id, $result['teamStats'], $result['hash'] );
			( new StatisticsRepository( $this->database ) )->replace_player_stats( $competition_id, $season_id, $result['playerStats'], $result['hash'] );
			( new AuditRepository( $this->database ) )->record( 'standings', (string) $competition_id . ':' . (string) $season_id, $reason, null, array( 'hash' => $result['hash'], 'rows' => count( $result['standings'] ) ) );
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
		return array( 'rebuildHash' => $result['hash'], 'rows' => count( $result['standings'] ), 'standings' => $result['standings'] );
	}

	public function table( string $competition_uuid, string $season_uuid = '' ): array {
		return array_map(
			fn( array $row ): array => array(
				'uuid'             => $row['uuid'],
				'position'         => (int) $row['position'],
				'team'             => array( 'uuid' => $row['team_uuid'], 'name' => $row['team_name'] ),
				'played'           => (int) $row['played'],
				'wins'             => (int) $row['wins'],
				'draws'            => (int) $row['draws'],
				'losses'           => (int) $row['losses'],
				'points'           => (int) $row['points'],
				'pointsFor'        => (int) $row['points_for'],
				'pointsAgainst'    => (int) $row['points_against'],
				'pointDifference'  => (int) $row['point_difference'],
				'form'             => $row['form'],
				'rebuildHash'      => $row['rebuild_hash'],
				'competition'      => array( 'uuid' => $row['competition_uuid'], 'name' => $row['competition_name'] ),
				'season'           => array( 'uuid' => $row['season_uuid'], 'name' => $row['season_name'] ),
				'tiebreakerOrder'  => json_decode( (string) ( $row['tiebreaker_json'] ?? '[]' ), true ) ?: StandingsCalculator::DEFAULT_TIEBREAKERS,
			),
			( new StandingsRepository( $this->database ) )->public_table( $competition_uuid, $season_uuid )
		);
	}

	public function team_stats( string $team_uuid ): array {
		return array_map(
			fn( array $row ): array => array(
				'team'       => array( 'uuid' => $row['team_uuid'], 'name' => $row['team_name'] ),
				'statKey'    => $row['stat_key'],
				'statValue'  => (int) $row['stat_value'],
				'updatedAt'  => $row['updated_at'],
			),
			( new StatisticsRepository( $this->database ) )->team_stats( $team_uuid )
		);
	}

	public function leaders( string $stat_key, int $limit = 10 ): array {
		return array_map(
			fn( array $row ): array => array(
				'player'    => array( 'uuid' => $row['player_uuid'], 'name' => $row['player_name'] ),
				'team'      => empty( $row['team_uuid'] ) ? null : array( 'uuid' => $row['team_uuid'], 'name' => $row['team_name'] ),
				'statKey'   => $row['stat_key'],
				'statValue' => (int) $row['stat_value'],
			),
			( new StatisticsRepository( $this->database ) )->leaders( sanitize_key( $stat_key ), $limit )
		);
	}

	public function create_discipline( array $input ): array {
		if ( ! current_user_can( 'instascore_manage_fixtures' ) ) {
			throw new ValidationException( array( 'permission' => 'You cannot manage discipline records.' ) );
		}
		$row = array(
			'uuid'           => wp_generate_uuid4(),
			'competition_id' => max( 1, (int) ( $input['competitionId'] ?? 0 ) ),
			'season_id'      => max( 1, (int) ( $input['seasonId'] ?? 0 ) ),
			'fixture_id'     => empty( $input['fixtureId'] ) ? null : (int) $input['fixtureId'],
			'team_id'        => empty( $input['teamId'] ) ? null : (int) $input['teamId'],
			'player_id'      => empty( $input['playerId'] ) ? null : (int) $input['playerId'],
			'record_type'    => sanitize_key( (string) ( $input['recordType'] ?? 'warning' ) ),
			'reason'         => sanitize_textarea_field( (string) ( $input['reason'] ?? '' ) ),
			'status'         => 'active',
			'issued_by'      => get_current_user_id() ?: null,
			'issued_at'      => gmdate( 'Y-m-d H:i:s' ),
			'created_at'     => gmdate( 'Y-m-d H:i:s' ),
			'updated_at'     => gmdate( 'Y-m-d H:i:s' ),
		);
		$this->database->query( 'START TRANSACTION' );
		try {
			$created = ( new BaseRepository( $this->database, 'disciplinary_records' ) )->create( $row );
			if ( 'suspension' === $row['record_type'] && null !== $row['player_id'] ) {
				$this->database->insert(
					$this->database->prefix . 'instascore_suspensions',
					array(
						'uuid'                   => wp_generate_uuid4(),
						'disciplinary_record_id' => (int) ( $created['id'] ?? 0 ),
						'competition_id'         => (int) $row['competition_id'],
						'season_id'              => (int) $row['season_id'],
						'team_id'                => $row['team_id'],
						'player_id'              => (int) $row['player_id'],
						'starts_at'              => gmdate( 'Y-m-d H:i:s' ),
						'ends_at'                => empty( $input['endsAt'] ) ? null : sanitize_text_field( (string) $input['endsAt'] ),
						'fixtures_remaining'     => max( 1, (int) ( $input['fixturesRemaining'] ?? 1 ) ),
						'status'                 => 'active',
						'reason'                 => $row['reason'],
						'created_by'             => get_current_user_id() ?: null,
						'created_at'             => gmdate( 'Y-m-d H:i:s' ),
						'updated_at'             => gmdate( 'Y-m-d H:i:s' ),
					)
				);
			}
			( new AuditRepository( $this->database ) )->record( 'discipline', (string) $created['uuid'], 'created', null, $created );
			$this->database->query( 'COMMIT' );
			return $created;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	public function suspension_warnings( int $player_id, int $competition_id, int $season_id ): array {
		return ( new DisciplineRepository( $this->database, 'disciplinary_records' ) )->active_suspensions_for_player( $player_id, $competition_id, $season_id );
	}

	private function fixture_scope( string $fixture_uuid ): array {
		$table = $this->database->prefix . 'instascore_fixtures';
		$row   = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$table} WHERE uuid = %s LIMIT 1", $fixture_uuid ), ARRAY_A );
		if ( ! is_array( $row ) ) {
			throw new ValidationException( array( 'fixture' => 'Fixture not found for standings rebuild.' ) );
		}
		return $row;
	}

	private function confirmed_fixtures( int $competition_id, int $season_id, ?int $stage_id, ?int $group_id ): array {
		$prefix = $this->database->prefix . 'instascore_';
		$where  = 'f.competition_id = %d AND f.season_id = %d AND f.status = %s';
		$args   = array( $competition_id, $season_id, 'confirmed' );
		if ( null !== $stage_id ) {
			$where .= ' AND f.stage_id = %d';
			$args[] = $stage_id;
		}
		if ( null !== $group_id ) {
			$where .= ' AND f.group_id = %d';
			$args[] = $group_id;
		}
		$rows = $this->database->get_results( $this->database->prepare( "SELECT f.*,ht.name home_team_name,at.name away_team_name FROM {$prefix}fixtures f JOIN {$prefix}teams ht ON ht.id = f.home_team_id JOIN {$prefix}teams at ON at.id = f.away_team_id WHERE {$where} ORDER BY f.kickoff_at ASC,f.id ASC", $args ), ARRAY_A );
		if ( ! is_array( $rows ) ) {
			return array();
		}
		foreach ( $rows as &$row ) {
			$events        = $this->database->get_results( $this->database->prepare( "SELECT * FROM {$prefix}match_events WHERE fixture_id = %d ORDER BY sequence_number ASC", (int) $row['id'] ), ARRAY_A );
			$row['events'] = is_array( $events ) ? $events : array();
		}
		unset( $row );
		return $rows;
	}

	private function competition_rules( int $competition_id ): array {
		$table = $this->database->prefix . 'instascore_competitions';
		$row   = $this->database->get_row( $this->database->prepare( "SELECT rules_json FROM {$table} WHERE id = %d LIMIT 1", $competition_id ), ARRAY_A );
		$rules = is_array( $row ) ? json_decode( (string) ( $row['rules_json'] ?? '{}' ), true ) : array();
		return is_array( $rules ) ? $rules : array();
	}
}
