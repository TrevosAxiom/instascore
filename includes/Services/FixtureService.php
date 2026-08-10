<?php
/**
 * Fixture scheduling service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\FixtureValidator;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Notifications\NotificationDispatcher;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\CompetitionRepository;
use InstaScore\Platform\Repositories\FixtureOfficialRepository;
use InstaScore\Platform\Repositories\FixtureRepository;
use InstaScore\Platform\Repositories\FixtureStatusHistoryRepository;
use InstaScore\Platform\Repositories\GroupRepository;
use InstaScore\Platform\Repositories\OfficialRepository;
use InstaScore\Platform\Repositories\SeasonRepository;
use InstaScore\Platform\Repositories\StageRepository;
use InstaScore\Platform\Repositories\TeamRepository;
use InstaScore\Platform\Repositories\VenueRepository;
use wpdb;

final class FixtureService {
	public function __construct(
		private readonly wpdb $database,
		private readonly FixtureValidator $validator
	) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb, new FixtureValidator() );
	}

	public function create_fixture( array $input ): array {
		$data = $this->validator->fixture( $input );
		$row  = $this->row_from_data( $data );
		$row  = $this->shared( array_merge( array( 'uuid' => wp_generate_uuid4(), 'status' => $data['status'] ?? 'draft' ), $row ) );
		return $this->persist( null, $row, $data, 'created' );
	}

	public function update_fixture( string $uuid, array $input ): array {
		$repository = new FixtureRepository( $this->database, 'fixtures' );
		$before     = $repository->find_by_uuid( $uuid );
		if ( null === $before ) {
			throw new ValidationException( array( 'fixture' => 'The selected fixture does not exist.' ) );
		}
		$data = $this->validator->fixture( $input, true );
		$row  = array_merge(
			$this->row_from_data( array_merge( $this->data_from_row( $before ), $data ) ),
			array(
				'updated_by' => get_current_user_id(),
				'updated_at' => gmdate( 'Y-m-d H:i:s' ),
				'revision'   => (int) $before['revision'] + 1,
			)
		);
		if ( isset( $data['status'] ) ) {
			$this->validator->transition( (string) $before['status'], (string) $data['status'] );
			$row['status'] = $data['status'];
		}
		return $this->persist( $before, $row, array_merge( $this->data_from_row( $before ), $data ), 'updated' );
	}

	public function change_status( string $uuid, string $status, string $reason = '' ): array {
		$repository = new FixtureRepository( $this->database, 'fixtures' );
		$before     = $repository->find_by_uuid( $uuid );
		if ( null === $before ) {
			throw new ValidationException( array( 'fixture' => 'The selected fixture does not exist.' ) );
		}
		$status = sanitize_key( $status );
		$this->validator->transition( (string) $before['status'], $status );
		$this->database->query( 'START TRANSACTION' );
		try {
			$after = $repository->update(
				$uuid,
				array(
					'status'     => $status,
					'updated_by' => get_current_user_id(),
					'updated_at' => gmdate( 'Y-m-d H:i:s' ),
					'revision'   => (int) $before['revision'] + 1,
				)
			);
			( new FixtureStatusHistoryRepository( $this->database, 'fixture_status_history' ) )->append( (int) $before['id'], (string) $before['status'], $status, sanitize_textarea_field( $reason ) );
			( new AuditRepository( $this->database ) )->record( 'fixture', $uuid, 'status_changed', $before, $after );
			$this->database->query( 'COMMIT' );
			if ( in_array( $status, array( 'abandoned', 'completed', 'confirmed' ), true ) || 'confirmed' === (string) $before['status'] ) {
				StandingsService::create()->rebuild_for_fixture_uuid( $uuid, 'fixture_status_recalculation' );
			}
			$this->notify_fixture_updated( $before, $after );
			return array( 'fixture' => $after );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	private function persist( ?array $before, array $row, array $data, string $action ): array {
		$repository   = new FixtureRepository( $this->database, 'fixtures' );
		$officials    = $this->official_rows( $data['officials'] ?? array() );
		$warning_rows = $repository->conflicts( (string) $row['kickoff_at'], (int) $row['home_team_id'], (int) $row['away_team_id'], null === $row['venue_id'] ? null : (int) $row['venue_id'], array_column( $officials, 'official_id' ), $before['uuid'] ?? null );
		$this->database->query( 'START TRANSACTION' );
		try {
			$fixture = null === $before ? $repository->create( $row ) : $repository->update( (string) $before['uuid'], $row );
			( new FixtureOfficialRepository( $this->database, 'fixture_officials' ) )->replace_for_fixture( (int) $fixture['id'], $officials );
			if ( null === $before ) {
				( new FixtureStatusHistoryRepository( $this->database, 'fixture_status_history' ) )->append( (int) $fixture['id'], null, (string) $fixture['status'], 'Fixture created.' );
			}
			( new AuditRepository( $this->database ) )->record( 'fixture', (string) $fixture['uuid'], $action, $before, $fixture );
			$this->database->query( 'COMMIT' );
			if ( null !== $before ) {
				$this->notify_fixture_updated( $before, $fixture );
			}
			return array(
				'fixture'  => $fixture,
				'warnings' => array_map(
					fn( array $item ): array => array(
						'type'      => 'schedule_conflict',
						'fixture'   => $item['uuid'] ?? '',
						'kickoffAt' => $item['kickoff_at'] ?? '',
						'message'   => 'Potential team, venue or official conflict within 150 minutes.',
					),
					$warning_rows
				),
			);
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	private function row_from_data( array $data ): array {
		$ids = array(
			'competition_id' => isset( $data['competition_id'] ) ? (int) $data['competition_id'] : ( new CompetitionRepository( $this->database, 'competitions' ) )->id_for_uuid( (string) $data['competitionUuid'] ),
			'season_id'      => isset( $data['season_id'] ) ? (int) $data['season_id'] : ( new SeasonRepository( $this->database, 'seasons' ) )->id_for_uuid( (string) $data['seasonUuid'] ),
			'stage_id'       => isset( $data['stage_id'] ) ? $data['stage_id'] : ( empty( $data['stageUuid'] ) ? null : ( new StageRepository( $this->database, 'stages' ) )->id_for_uuid( (string) $data['stageUuid'] ) ),
			'group_id'       => isset( $data['group_id'] ) ? $data['group_id'] : ( empty( $data['groupUuid'] ) ? null : ( new GroupRepository( $this->database, 'groups' ) )->id_for_uuid( (string) $data['groupUuid'] ) ),
			'home_team_id'   => isset( $data['home_team_id'] ) ? (int) $data['home_team_id'] : ( new TeamRepository( $this->database, 'teams' ) )->id_for_uuid( (string) $data['homeTeamUuid'] ),
			'away_team_id'   => isset( $data['away_team_id'] ) ? (int) $data['away_team_id'] : ( new TeamRepository( $this->database, 'teams' ) )->id_for_uuid( (string) $data['awayTeamUuid'] ),
			'venue_id'       => array_key_exists( 'venue_id', $data ) ? $data['venue_id'] : ( empty( $data['venueUuid'] ) ? null : ( new VenueRepository( $this->database, 'venues' ) )->id_for_uuid( (string) $data['venueUuid'] ) ),
		);
		if ( null === $ids['competition_id'] || null === $ids['season_id'] || null === $ids['home_team_id'] || null === $ids['away_team_id'] ) {
			throw new ValidationException( array( 'fixture' => 'Competition, season and both teams must exist.' ) );
		}
		return array_merge(
			$ids,
			array(
				'kickoff_at'                => $data['kickoffAtUtc'],
				'timezone'                  => $data['timezone'],
				'round_name'                => $data['roundName'] ?? '',
				'match_day'                 => $data['matchDay'] ?? null,
				'leg_number'                => $data['legNumber'] ?? null,
				'bracket_slot'              => $data['bracketSlot'] ?? '',
				'home_source_fixture_id'    => null,
				'away_source_fixture_id'    => null,
				'winner_next_fixture_id'    => null,
				'loser_next_fixture_id'     => null,
				'metadata_json'             => '{}',
			)
		);
	}

	private function data_from_row( array $row ): array {
		return array(
			'competitionUuid' => (string) ( $row['competition_uuid'] ?? '' ),
			'seasonUuid'      => (string) ( $row['season_uuid'] ?? '' ),
			'stageUuid'       => (string) ( $row['stage_uuid'] ?? '' ),
			'groupUuid'       => (string) ( $row['group_uuid'] ?? '' ),
			'homeTeamUuid'    => (string) ( $row['home_team_uuid'] ?? '' ),
			'awayTeamUuid'    => (string) ( $row['away_team_uuid'] ?? '' ),
			'venueUuid'       => (string) ( $row['venue_uuid'] ?? '' ),
			'kickoffAtUtc'    => (string) $row['kickoff_at'],
			'timezone'        => (string) $row['timezone'],
			'roundName'       => (string) ( $row['round_name'] ?? '' ),
			'matchDay'        => $row['match_day'] ?? null,
			'legNumber'       => $row['leg_number'] ?? null,
			'bracketSlot'     => (string) ( $row['bracket_slot'] ?? '' ),
			'officials'       => array(),
			'competition_id'  => (int) $row['competition_id'],
			'season_id'       => (int) $row['season_id'],
			'stage_id'        => $row['stage_id'] ?? null,
			'group_id'        => $row['group_id'] ?? null,
			'home_team_id'    => (int) $row['home_team_id'],
			'away_team_id'    => (int) $row['away_team_id'],
			'venue_id'        => $row['venue_id'] ?? null,
		);
	}

	private function official_rows( array $officials ): array {
		$repository = new OfficialRepository( $this->database, 'officials' );
		$rows       = array();
		foreach ( $officials as $official ) {
			$id = $repository->id_for_uuid( (string) $official['officialUuid'] );
			if ( null === $id ) {
				throw new ValidationException( array( 'officials' => 'Every assigned official must exist.' ) );
			}
			$rows[] = array( 'official_id' => $id, 'role' => $official['role'] );
		}
		return $rows;
	}

	private function shared( array $row ): array {
		return array_merge(
			$row,
			array(
				'source'     => 'internal',
				'created_by' => get_current_user_id(),
				'updated_by' => get_current_user_id(),
				'created_at' => gmdate( 'Y-m-d H:i:s' ),
				'updated_at' => gmdate( 'Y-m-d H:i:s' ),
				'revision'   => 1,
			)
		);
	}

	/** @param array<string,mixed> $before @param array<string,mixed> $after */
	private function notify_fixture_updated( array $before, array $after ): void {
		try {
			NotificationDispatcher::create()->fixture_updated( $before, $after );
		} catch ( \Throwable $error ) {
			error_log( 'InstaScore fixture notification enqueue failed: ' . $error->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
	}
}
