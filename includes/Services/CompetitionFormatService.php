<?php
/**
 * Competition structure, schedule and playoff operations.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use DateTimeImmutable;
use InstaScore\Platform\Domain\RoundRobinGenerator;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\CompetitionRepository;
use InstaScore\Platform\Repositories\SeasonRepository;
use wpdb;

final class CompetitionFormatService {
	public function __construct( private readonly wpdb $database, private readonly RoundRobinGenerator $generator ) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb, new RoundRobinGenerator() );
	}

	/** @return array<string,mixed> */
	public function structure( string $competition_uuid, string $season_uuid ): array {
		$scope = $this->scope( $competition_uuid, $season_uuid );
		$prefix = $this->database->prefix . 'instascore_';
		$stages = $this->database->get_results( $this->database->prepare( "SELECT uuid,name,slug,stage_type type,sort_order sortOrder,status FROM {$prefix}stages WHERE season_id=%d ORDER BY sort_order,id", $scope['season']['id'] ), ARRAY_A );
		$fixtures = $this->database->get_results( $this->database->prepare( "SELECT f.uuid,f.round_name roundName,f.match_day matchDay,f.bracket_slot bracketSlot,f.status,f.kickoff_at kickoffAt,ht.name homeTeam,at.name awayTeam FROM {$prefix}fixtures f JOIN {$prefix}teams ht ON ht.id=f.home_team_id JOIN {$prefix}teams at ON at.id=f.away_team_id WHERE f.competition_id=%d AND f.season_id=%d ORDER BY f.kickoff_at,f.id", $scope['competition']['id'], $scope['season']['id'] ), ARRAY_A );
		return array( 'competitionUuid' => $competition_uuid, 'seasonUuid' => $season_uuid, 'stages' => is_array( $stages ) ? $stages : array(), 'fixtures' => is_array( $fixtures ) ? $fixtures : array() );
	}

	/** @param array<string,mixed> $input Input. */
	public function generate_league( string $competition_uuid, array $input ): array {
		$scope = $this->scope( $competition_uuid, sanitize_text_field( (string) ( $input['seasonUuid'] ?? '' ) ) );
		$start = $this->date( (string) ( $input['startDate'] ?? $scope['season']['start_date'] ) );
		$this->assert_date_in_season( $start, $scope['season'] );
		$time = preg_match( '/^\d{2}:\d{2}$/', (string) ( $input['kickoffTime'] ?? '' ) ) ? (string) $input['kickoffTime'] : '15:00';
		$interval = min( 30, max( 1, (int) ( $input['intervalDays'] ?? 7 ) ) );
		$teams = $this->teams( (int) $scope['competition']['sport_id'], (int) $scope['season']['id'] );
		$rounds = $this->generator->generate( array_column( $teams, 'id' ), rest_sanitize_boolean( $input['doubleRoundRobin'] ?? false ) );
		$created = 0;
		$this->database->query( 'START TRANSACTION' );
		try {
			$stage_id = $this->ensure_stage( (int) $scope['season']['id'], 'Regular season', 'league', 10 );
			$this->assert_empty_schedule( (int) $scope['competition']['id'], (int) $scope['season']['id'], $stage_id );
			foreach ( $rounds as $round_index => $pairs ) {
				$kickoff = $start->modify( '+' . ( $round_index * $interval ) . ' days' )->format( 'Y-m-d' ) . ' ' . $time . ':00';
				foreach ( $pairs as $pair ) {
					$this->create_fixture( $scope, $stage_id, $pair['home'], $pair['away'], $kickoff, 'Round ' . ( $round_index + 1 ), $round_index + 1, '' );
					++$created;
				}
			}
			( new AuditRepository( $this->database ) )->record( 'competition_schedule', $competition_uuid, 'round_robin_generated', null, array( 'seasonUuid' => $scope['season']['uuid'], 'fixtures' => $created, 'rounds' => count( $rounds ) ) );
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
		return array( 'created' => $created, 'rounds' => count( $rounds ), 'teams' => count( $teams ) );
	}

	/** @param array<string,mixed> $input Input. */
	public function generate_playoffs( string $competition_uuid, array $input ): array {
		$scope = $this->scope( $competition_uuid, sanitize_text_field( (string) ( $input['seasonUuid'] ?? '' ) ) );
		$qualifiers = (int) ( $input['qualifiers'] ?? 4 );
		if ( ! in_array( $qualifiers, array( 2, 4, 8 ), true ) ) {
			throw new ValidationException( array( 'qualifiers' => 'Choose 2, 4 or 8 playoff qualifiers.' ) );
		}
		$prefix = $this->database->prefix . 'instascore_';
		$rows = $this->database->get_results( $this->database->prepare( "SELECT team_id,position FROM {$prefix}standings WHERE competition_id=%d AND season_id=%d ORDER BY position LIMIT %d", $scope['competition']['id'], $scope['season']['id'], $qualifiers ), ARRAY_A );
		if ( ! is_array( $rows ) || count( $rows ) < $qualifiers ) {
			throw new ValidationException( array( 'standings' => 'Confirm results and rebuild the table before seeding playoffs.' ) );
		}
		$start = $this->date( (string) ( $input['startDate'] ?? gmdate( 'Y-m-d' ) ) );
		$this->assert_date_in_season( $start, $scope['season'] );
		$time = preg_match( '/^\d{2}:\d{2}$/', (string) ( $input['kickoffTime'] ?? '' ) ) ? (string) $input['kickoffTime'] : '15:00';
		$created = 0;
		$this->database->query( 'START TRANSACTION' );
		try {
			$stage_id = $this->ensure_stage( (int) $scope['season']['id'], 'Playoffs', 'knockout', 20 );
			$this->assert_empty_schedule( (int) $scope['competition']['id'], (int) $scope['season']['id'], $stage_id );
			for ( $index = 0; $index < $qualifiers / 2; ++$index ) {
				$home = (int) $rows[ $index ]['team_id'];
				$away = (int) $rows[ $qualifiers - 1 - $index ]['team_id'];
				$slot = 2 === $qualifiers ? 'Final' : ( 4 === $qualifiers ? 'Semifinal ' . ( $index + 1 ) : 'Quarterfinal ' . ( $index + 1 ) );
				$this->create_fixture( $scope, $stage_id, $home, $away, $start->format( 'Y-m-d' ) . ' ' . $time . ':00', $slot, 1, $slot );
				++$created;
			}
			( new AuditRepository( $this->database ) )->record( 'competition_playoffs', $competition_uuid, 'playoffs_seeded', null, array( 'qualifiers' => $qualifiers, 'fixtures' => $created ) );
			$this->database->query( 'COMMIT' );
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
		return array( 'created' => $created, 'qualifiers' => $qualifiers );
	}

	/** @return array{competition:array<string,mixed>,season:array<string,mixed>} */
	private function scope( string $competition_uuid, string $season_uuid ): array {
		$competition = ( new CompetitionRepository( $this->database, 'competitions' ) )->find_by_uuid( $competition_uuid );
		$season = ( new SeasonRepository( $this->database, 'seasons' ) )->find_by_uuid( $season_uuid );
		if ( null === $competition || null === $season || (int) $season['competition_id'] !== (int) $competition['id'] ) {
			throw new ValidationException( array( 'seasonUuid' => 'Choose a season from this competition.' ) );
		}
		return array( 'competition' => $competition, 'season' => $season );
	}

	private function date( string $value ): DateTimeImmutable {
		$date = DateTimeImmutable::createFromFormat( '!Y-m-d', $value );
		if ( ! $date || $date->format( 'Y-m-d' ) !== $value ) {
			throw new ValidationException( array( 'startDate' => 'Choose a valid schedule start date.' ) );
		}
		return $date;
	}

	/** @param array<string,mixed> $season Season row. */
	private function assert_date_in_season( DateTimeImmutable $date, array $season ): void {
		$value = $date->format( 'Y-m-d' );
		if ( $value < (string) $season['start_date'] || $value > (string) $season['end_date'] ) {
			throw new ValidationException( array( 'startDate' => 'The schedule must start within the selected season.' ) );
		}
	}

	/** @return array<int,array{id:int,name:string}> */
	private function teams( int $sport_id, int $season_id ): array {
		$prefix = $this->database->prefix . 'instascore_';
		$rows = $this->database->get_results( $this->database->prepare( "SELECT DISTINCT t.id,t.name FROM {$prefix}teams t LEFT JOIN {$prefix}team_registrations r ON r.team_id=t.id AND r.season_id=%d AND r.status='active' WHERE t.sport_id=%d AND t.status='active' AND (r.id IS NOT NULL OR NOT EXISTS (SELECT 1 FROM {$prefix}team_registrations rx WHERE rx.season_id=%d)) ORDER BY t.name", $season_id, $sport_id, $season_id ), ARRAY_A );
		return is_array( $rows ) ? array_map( static fn( array $row ): array => array( 'id' => (int) $row['id'], 'name' => (string) $row['name'] ), $rows ) : array();
	}

	private function ensure_stage( int $season_id, string $name, string $type, int $sort ): int {
		$table = $this->database->prefix . 'instascore_stages';
		$id = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$table} WHERE season_id=%d AND stage_type=%s AND status='active' LIMIT 1", $season_id, $type ) );
		if ( $id ) return (int) $id;
		$inserted = $this->database->insert( $table, array( 'uuid' => wp_generate_uuid4(), 'season_id' => $season_id, 'name' => $name, 'slug' => sanitize_title( $name ), 'stage_type' => $type, 'sort_order' => $sort, 'status' => 'active', 'source' => 'internal', 'created_by' => get_current_user_id(), 'updated_by' => get_current_user_id(), 'created_at' => gmdate( 'Y-m-d H:i:s' ), 'updated_at' => gmdate( 'Y-m-d H:i:s' ), 'revision' => 1 ) );
		if ( false === $inserted ) {
			throw new \RuntimeException( 'The competition stage could not be created.' );
		}
		return (int) $this->database->insert_id;
	}

	private function assert_empty_schedule( int $competition_id, int $season_id, int $stage_id ): void {
		$table = $this->database->prefix . 'instascore_fixtures';
		$count = (int) $this->database->get_var( $this->database->prepare( "SELECT COUNT(*) FROM {$table} WHERE competition_id=%d AND season_id=%d AND stage_id=%d AND status <> 'cancelled'", $competition_id, $season_id, $stage_id ) );
		if ( $count > 0 ) throw new ValidationException( array( 'fixtures' => 'This stage already has fixtures. Archive or edit them instead of generating duplicates.' ) );
	}

	/** @param array{competition:array<string,mixed>,season:array<string,mixed>} $scope */
	private function create_fixture( array $scope, int $stage_id, int $home, int $away, string $kickoff, string $round, int $match_day, string $slot ): void {
		$inserted = $this->database->insert( $this->database->prefix . 'instascore_fixtures', array( 'uuid' => wp_generate_uuid4(), 'competition_id' => $scope['competition']['id'], 'season_id' => $scope['season']['id'], 'stage_id' => $stage_id, 'group_id' => null, 'home_team_id' => $home, 'away_team_id' => $away, 'venue_id' => null, 'kickoff_at' => $kickoff, 'timezone' => wp_timezone_string() ?: 'UTC', 'round_name' => $round, 'match_day' => $match_day, 'leg_number' => 1, 'bracket_slot' => $slot, 'metadata_json' => '{}', 'status' => 'draft', 'source' => 'internal', 'created_by' => get_current_user_id(), 'updated_by' => get_current_user_id(), 'created_at' => gmdate( 'Y-m-d H:i:s' ), 'updated_at' => gmdate( 'Y-m-d H:i:s' ), 'revision' => 1 ) );
		if ( false === $inserted ) {
			throw new \RuntimeException( 'A generated fixture could not be saved.' );
		}
	}
}
