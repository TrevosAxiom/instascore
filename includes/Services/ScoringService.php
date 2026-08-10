<?php
/**
 * Live scoring service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Auth\ScoringPermissions;
use InstaScore\Platform\Domain\ScoreEventValidator;
use InstaScore\Platform\Domain\ScoreReducer;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\FixtureRepository;
use InstaScore\Platform\Repositories\MatchClockRepository;
use InstaScore\Platform\Repositories\MatchEventRepository;
use InstaScore\Platform\Repositories\PlayerRepository;
use InstaScore\Platform\Repositories\ScorekeeperAssignmentRepository;
use wpdb;

final class ScoringService {
	public function __construct(
		private readonly wpdb $database,
		private readonly ScoreEventValidator $validator,
		private readonly ScoreReducer $reducer
	) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb, new ScoreEventValidator(), new ScoreReducer() );
	}

	public function assign_scorekeeper( string $fixture_uuid, int $user_id ): array {
		$fixture = $this->fixture( $fixture_uuid );
		$row     = array(
			'uuid'        => wp_generate_uuid4(),
			'fixture_id'  => (int) $fixture['id'],
			'user_id'     => $user_id,
			'status'      => 'active',
			'claimed_at'  => null,
			'released_at' => null,
			'created_by'  => get_current_user_id(),
			'created_at'  => gmdate( 'Y-m-d H:i:s' ),
			'updated_at'  => gmdate( 'Y-m-d H:i:s' ),
		);
		$this->database->query( 'START TRANSACTION' );
		try {
			$created = ( new ScorekeeperAssignmentRepository( $this->database, 'scorekeeper_assignments' ) )->create( $row );
			( new AuditRepository( $this->database ) )->record( 'scorekeeper_assignment', (string) $created['uuid'], 'created', null, $created );
			$this->database->query( 'COMMIT' );
			return $created;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	public function claim_fixture( string $fixture_uuid ): array {
		$fixture = $this->fixture( $fixture_uuid );
		$this->assert_scorekeeper( (int) $fixture['id'] );
		$repo    = new ScorekeeperAssignmentRepository( $this->database, 'scorekeeper_assignments' );
		$claimed = $repo->claimed_for_fixture( (int) $fixture['id'] );
		if ( null !== $claimed && (int) $claimed['user_id'] !== get_current_user_id() ) {
			throw new ValidationException( array( 'claim' => 'This fixture is already claimed by another scorekeeper.' ) );
		}
		$assignment = $repo->active_for_user_fixture( (int) $fixture['id'], get_current_user_id() );
		return $repo->update(
			(string) $assignment['uuid'],
			array(
				'claimed_at'  => gmdate( 'Y-m-d H:i:s' ),
				'released_at' => null,
				'updated_at'  => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}

	public function release_fixture( string $fixture_uuid ): array {
		$fixture    = $this->fixture( $fixture_uuid );
		$assignment = $this->assert_scorekeeper( (int) $fixture['id'] );
		return ( new ScorekeeperAssignmentRepository( $this->database, 'scorekeeper_assignments' ) )->update(
			(string) $assignment['uuid'],
			array(
				'released_at' => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'  => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}

	public function append_event( string $fixture_uuid, array $input ): array {
		$fixture = $this->fixture( $fixture_uuid );
		$this->assert_scorekeeper( (int) $fixture['id'] );
		$data       = $this->validator->event( $input );
		$events     = new MatchEventRepository( $this->database, 'match_events' );
		$duplicate  = $events->find_by_client_event_id( (int) $fixture['id'], (string) $data['client_event_id'] );
		if ( null !== $duplicate ) {
			return $this->snapshot( $fixture, true, $duplicate );
		}
		$revision = $events->current_revision( (int) $fixture['id'] );
		if ( (int) $data['expected_revision'] !== $revision ) {
			throw new ValidationException( array( 'revision' => 'The match has changed on another device. Refresh before submitting.' ) );
		}
		$team_id = $this->team_id( $fixture, $data['team_side'] );
		$row     = array(
			'uuid'                => wp_generate_uuid4(),
			'fixture_id'          => (int) $fixture['id'],
			'client_event_id'     => $data['client_event_id'],
			'sequence_number'     => $events->next_sequence( (int) $fixture['id'] ),
			'revision'            => $revision + 1,
			'event_type'          => $data['event_type'],
			'team_side'           => $data['team_side'],
			'team_id'             => $team_id,
			'primary_player_id'   => $this->player_id( (string) $data['primary_player_uuid'] ),
			'secondary_player_id' => $this->player_id( (string) $data['secondary_player_uuid'] ),
			'period'              => $data['period'],
			'clock_seconds'       => $data['clock_seconds'],
			'points'              => $data['points'],
			'description'         => $data['description'],
			'payload_json'        => wp_json_encode( $input ),
			'voided_at'           => null,
			'voided_by'           => null,
			'void_reason'         => null,
			'corrects_event_id'   => '' === $data['corrects_event_uuid'] ? null : $events->id_for_uuid( (string) $data['corrects_event_uuid'] ),
			'created_by'          => get_current_user_id(),
			'created_at'          => gmdate( 'Y-m-d H:i:s' ),
		);
		$this->database->query( 'START TRANSACTION' );
		try {
			$created = $events->create( $row );
			( new AuditRepository( $this->database ) )->record( 'match_event', (string) $created['uuid'], 'created', null, $created );
			$this->database->query( 'COMMIT' );
			return $this->snapshot( $fixture, false, $created );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	public function void_event( string $fixture_uuid, string $event_uuid, string $reason ): array {
		$fixture = $this->fixture( $fixture_uuid );
		$this->assert_scorekeeper( (int) $fixture['id'] );
		$events = new MatchEventRepository( $this->database, 'match_events' );
		$before = $events->find_by_uuid( $event_uuid );
		if ( null === $before || (int) $before['fixture_id'] !== (int) $fixture['id'] ) {
			throw new ValidationException( array( 'event' => 'The selected event does not exist for this fixture.' ) );
		}
		$this->database->query( 'START TRANSACTION' );
		try {
			$after = $events->void_event( $event_uuid, sanitize_textarea_field( $reason ) );
			( new AuditRepository( $this->database ) )->record( 'match_event', $event_uuid, 'voided', $before, $after );
			$this->database->query( 'COMMIT' );
			StandingsService::create()->rebuild_for_fixture_uuid( $fixture_uuid, 'match_event_voided' );
			return $this->snapshot( $fixture, false, $after );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	public function clock( string $fixture_uuid, string $action, array $input = array() ): array {
		$fixture = $this->fixture( $fixture_uuid );
		$this->assert_scorekeeper( (int) $fixture['id'] );
		$repo  = new MatchClockRepository( $this->database, 'match_clock_states' );
		$clock = $repo->ensure( (int) $fixture['id'] );
		$this->validator->clock_action( sanitize_key( $action ), (string) $clock['status'] );
		$next = $this->next_clock( $clock, $action, $input );
		$repo->update( (string) $clock['uuid'], $next );
		return $this->public_state( $fixture_uuid );
	}

	public function complete_fixture( string $fixture_uuid ): array {
		$fixture = $this->fixture( $fixture_uuid );
		$this->assert_scorekeeper( (int) $fixture['id'] );
		return FixtureService::create()->change_status( $fixture_uuid, 'completed', 'Completed by scorekeeper.' );
	}

	public function confirm_result( string $fixture_uuid ): array {
		if ( ! ScoringPermissions::confirm_results() ) {
			throw new ValidationException( array( 'permission' => 'You cannot confirm results.' ) );
		}
		return FixtureService::create()->change_status( $fixture_uuid, 'confirmed', 'Confirmed by commissioner.' );
	}

	public function public_state( string $fixture_uuid, int $after_revision = 0 ): array {
		$fixture = $this->fixture( $fixture_uuid, true );
		return $this->snapshot( $fixture, false, null, $after_revision );
	}

	private function snapshot( array $fixture, bool $idempotent = false, ?array $event = null, int $after_revision = 0 ): array {
		$events = new MatchEventRepository( $this->database, 'match_events' );
		$all    = $events->for_fixture( (int) $fixture['id'] );
		$delta  = 0 < $after_revision ? $events->for_fixture( (int) $fixture['id'], $after_revision ) : $all;
		$clock  = ( new MatchClockRepository( $this->database, 'match_clock_states' ) )->ensure( (int) $fixture['id'] );
		return array(
			'fixture'    => $this->present_fixture( $fixture ),
			'score'      => $this->reducer->reduce( $all ),
			'clock'      => $this->present_clock( $clock ),
			'events'     => array_map( array( $this, 'present_event' ), $delta ),
			'revision'   => $events->current_revision( (int) $fixture['id'] ),
			'idempotent' => $idempotent,
			'event'      => null === $event ? null : $this->present_event( $event ),
			'provisional'=> 'confirmed' !== ( $fixture['status'] ?? '' ),
		);
	}

	private function fixture( string $uuid, bool $public = false ): array {
		$row = ( new FixtureRepository( $this->database, 'fixtures' ) )->find_public_by_uuid( $uuid );
		if ( null === $row && ! $public ) {
			$row = ( new FixtureRepository( $this->database, 'fixtures' ) )->find_by_uuid( $uuid );
		}
		if ( null === $row ) {
			throw new ValidationException( array( 'fixture' => 'Fixture not found.' ) );
		}
		return $row;
	}

	private function assert_scorekeeper( int $fixture_id ): array {
		if ( ScoringPermissions::override_scorekeeper_scope() ) {
			return array();
		}
		$assignment = ( new ScorekeeperAssignmentRepository( $this->database, 'scorekeeper_assignments' ) )->active_for_user_fixture( $fixture_id, get_current_user_id() );
		if ( null === $assignment ) {
			throw new ValidationException( array( 'permission' => 'You are not assigned to score this fixture.' ) );
		}
		return $assignment;
	}

	private function team_id( array $fixture, ?string $side ): ?int {
		return match ( $side ) {
			'home' => (int) $fixture['home_team_id'],
			'away' => (int) $fixture['away_team_id'],
			default => null,
		};
	}

	private function player_id( string $uuid ): ?int {
		return '' === $uuid ? null : ( new PlayerRepository( $this->database, 'players' ) )->id_for_uuid( $uuid );
	}

	private function next_clock( array $clock, string $action, array $input ): array {
		$period = max( 1, (int) ( $input['period'] ?? $clock['period'] ) );
		$base   = array(
			'updated_by' => get_current_user_id(),
			'updated_at' => gmdate( 'Y-m-d H:i:s' ),
			'revision'   => (int) $clock['revision'] + 1,
		);
		return match ( $action ) {
			'start' => array_merge( $base, array( 'status' => 'running', 'period' => 1, 'period_label' => '1st', 'running' => 1, 'started_at' => gmdate( 'Y-m-d H:i:s' ) ) ),
			'pause' => array_merge( $base, array( 'status' => 'paused', 'running' => 0, 'paused_at' => gmdate( 'Y-m-d H:i:s' ), 'clock_seconds' => max( 0, (int) ( $input['clockSeconds'] ?? $clock['clock_seconds'] ) ) ) ),
			'resume' => array_merge( $base, array( 'status' => 'running', 'running' => 1, 'paused_at' => null ) ),
			'period_end' => array_merge( $base, array( 'status' => 'period_end', 'running' => 0, 'clock_seconds' => max( 0, (int) ( $input['clockSeconds'] ?? $clock['clock_seconds'] ) ) ) ),
			'period_start' => array_merge( $base, array( 'status' => 'running', 'period' => $period, 'period_label' => $period . 'Q', 'running' => 1, 'clock_seconds' => 0 ) ),
			'complete' => array_merge( $base, array( 'status' => 'completed', 'running' => 0 ) ),
			default => $base,
		};
	}

	private function present_fixture( array $fixture ): array {
		return array(
			'uuid'     => $fixture['uuid'],
			'status'   => $fixture['status'],
			'homeTeam' => array( 'uuid' => $fixture['home_team_uuid'] ?? '', 'name' => $fixture['home_team_name'] ?? 'Home' ),
			'awayTeam' => array( 'uuid' => $fixture['away_team_uuid'] ?? '', 'name' => $fixture['away_team_name'] ?? 'Away' ),
		);
	}

	private function present_clock( array $clock ): array {
		return array(
			'status'       => $clock['status'],
			'period'       => (int) $clock['period'],
			'periodLabel'  => $clock['period_label'],
			'clockSeconds' => (int) $clock['clock_seconds'],
			'running'      => (bool) $clock['running'],
			'revision'     => (int) $clock['revision'],
		);
	}

	private function present_event( array $event ): array {
		return array(
			'uuid'           => $event['uuid'],
			'clientEventId'  => $event['client_event_id'],
			'sequenceNumber' => (int) $event['sequence_number'],
			'revision'       => (int) $event['revision'],
			'eventType'      => $event['event_type'],
			'teamSide'       => $event['team_side'],
			'period'         => (int) $event['period'],
			'clockSeconds'   => (int) $event['clock_seconds'],
			'points'         => (int) $event['points'],
			'description'    => $event['description'],
			'voided'         => ! empty( $event['voided_at'] ),
			'createdAt'      => $event['created_at'],
		);
	}
}
