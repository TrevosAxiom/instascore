<?php
/**
 * Validated CSV fixture importer.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
use wpdb;

final class FixtureCsvImportService {
	private const REQUIRED_HEADERS = array( 'competition_slug', 'home_team_slug', 'away_team_slug', 'kickoff_at' );

	public function __construct( private readonly wpdb $database ) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb );
	}

	/** @return array{created:int,skipped:int,errors:array<int,array{row:int,message:string}>,warnings:int} */
	public function import( string $path ): array {
		$result = array( 'created' => 0, 'skipped' => 0, 'errors' => array(), 'warnings' => 0 );
		$handle = fopen( $path, 'r' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
		if ( false === $handle ) {
			throw new ValidationException( array( 'file' => 'The uploaded CSV file could not be read.' ) );
		}
		$headers = fgetcsv( $handle );
		if ( ! is_array( $headers ) ) {
			fclose( $handle );
			throw new ValidationException( array( 'file' => 'The CSV file is empty.' ) );
		}
		$headers = array_map( static fn( mixed $value ): string => sanitize_key( trim( (string) $value ) ), $headers );
		$missing = array_diff( self::REQUIRED_HEADERS, $headers );
		if ( $missing ) {
			fclose( $handle );
			throw new ValidationException( array( 'file' => 'Missing required headers: ' . implode( ', ', $missing ) . '.' ) );
		}

		$row_number = 1;
		while ( false !== ( $values = fgetcsv( $handle ) ) ) {
			++$row_number;
			if ( array() === array_filter( $values, static fn( mixed $value ): bool => '' !== trim( (string) $value ) ) ) continue;
			$row = array_combine( $headers, array_pad( array_slice( $values, 0, count( $headers ) ), count( $headers ), '' ) );
			if ( ! is_array( $row ) ) {
				$result['errors'][] = array( 'row' => $row_number, 'message' => 'The row has an invalid column count.' );
				continue;
			}
			try {
				$input = $this->input( $row );
				if ( $this->duplicate_exists( $input ) ) {
					++$result['skipped'];
					continue;
				}
				$created = FixtureService::create()->create_fixture( $input );
				++$result['created'];
				$result['warnings'] += count( $created['warnings'] ?? array() );
			} catch ( \Throwable $error ) {
				$result['errors'][] = array( 'row' => $row_number, 'message' => $error->getMessage() );
			}
		}
		fclose( $handle );
		return $result;
	}

	/** @param array<string,mixed> $row @return array<string,mixed> */
	private function input( array $row ): array {
		$competition = $this->competition( sanitize_title( (string) $row['competition_slug'] ) );
		$season_slug = sanitize_title( (string) ( $row['season_slug'] ?? '' ) );
		$season_uuid = $this->season_uuid( $competition, $season_slug );
		$sport_id = (int) $competition['sport_id'];
		$home_uuid = $this->entity_uuid( 'teams', sanitize_title( (string) $row['home_team_slug'] ), $sport_id );
		$away_uuid = $this->entity_uuid( 'teams', sanitize_title( (string) $row['away_team_slug'] ), $sport_id );
		$venue_slug = sanitize_title( (string) ( $row['venue_slug'] ?? '' ) );
		$venue_uuid = '' === $venue_slug ? '' : $this->entity_uuid( 'venues', $venue_slug );
		return array(
			'competitionUuid' => (string) $competition['uuid'],
			'seasonUuid'      => $season_uuid,
			'homeTeamUuid'    => $home_uuid,
			'awayTeamUuid'    => $away_uuid,
			'venueUuid'       => $venue_uuid,
			'kickoffAt'       => sanitize_text_field( (string) $row['kickoff_at'] ),
			'timezone'        => sanitize_text_field( (string) ( $row['timezone'] ?: 'Africa/Lagos' ) ),
			'roundName'       => sanitize_text_field( (string) ( $row['round_name'] ?? '' ) ),
			'matchDay'        => sanitize_text_field( (string) ( $row['match_day'] ?? '' ) ),
			'bracketSlot'     => sanitize_text_field( (string) ( $row['bracket_slot'] ?? '' ) ),
			'status'          => in_array( sanitize_key( (string) ( $row['status'] ?? 'draft' ) ), array( 'draft', 'scheduled' ), true ) ? sanitize_key( (string) ( $row['status'] ?? 'draft' ) ) : 'draft',
		);
	}

	/** @return array<string,mixed> */
	private function competition( string $slug ): array {
		$table = $this->database->prefix . 'instascore_competitions';
		$row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$table} WHERE slug = %s AND status = 'active' LIMIT 1", $slug ), ARRAY_A );
		if ( ! is_array( $row ) ) throw new ValidationException( array( 'competition_slug' => "Competition '{$slug}' was not found." ) );
		return $row;
	}

	/** @param array<string,mixed> $competition */
	private function season_uuid( array $competition, string $slug ): string {
		$table = $this->database->prefix . 'instascore_seasons';
		if ( '' !== $slug ) {
			$uuid = $this->database->get_var( $this->database->prepare( "SELECT uuid FROM {$table} WHERE competition_id = %d AND slug = %s AND status = 'active' LIMIT 1", (int) $competition['id'], $slug ) );
		} else {
			$rules = json_decode( (string) ( $competition['rules_json'] ?? '{}' ), true );
			$uuid = is_array( $rules ) ? (string) ( $rules['default_season_uuid'] ?? '' ) : '';
		}
		if ( empty( $uuid ) ) throw new ValidationException( array( 'season_slug' => 'Season was not found. Supply season_slug or configure the competition default season.' ) );
		return (string) $uuid;
	}

	private function entity_uuid( string $entity, string $slug, ?int $sport_id = null ): string {
		$table = $this->database->prefix . 'instascore_' . $entity;
		$sql = "SELECT uuid FROM {$table} WHERE slug = %s AND status = 'active'";
		$args = array( $slug );
		if ( null !== $sport_id ) { $sql .= ' AND sport_id = %d'; $args[] = $sport_id; }
		$uuid = $this->database->get_var( $this->database->prepare( $sql . ' LIMIT 1', $args ) );
		if ( empty( $uuid ) ) throw new ValidationException( array( $entity => ucfirst( rtrim( $entity, 's' ) ) . " '{$slug}' was not found." ) );
		return (string) $uuid;
	}

	/** @param array<string,mixed> $input */
	private function duplicate_exists( array $input ): bool {
		$fixtures = $this->database->prefix . 'instascore_fixtures';
		$teams = $this->database->prefix . 'instascore_teams';
		$kickoff = ( new \DateTimeImmutable( (string) $input['kickoffAt'], new \DateTimeZone( (string) $input['timezone'] ) ) )->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
		$count = $this->database->get_var( $this->database->prepare( "SELECT COUNT(*) FROM {$fixtures} f JOIN {$teams} h ON h.id=f.home_team_id JOIN {$teams} a ON a.id=f.away_team_id WHERE h.uuid=%s AND a.uuid=%s AND f.kickoff_at=%s", $input['homeTeamUuid'], $input['awayTeamUuid'], $kickoff ) );
		return 0 < (int) $count;
	}
}
