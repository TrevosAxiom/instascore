<?php
/**
 * Teams, players and registrations service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Auth\TeamPermissions;
use InstaScore\Platform\Domain\TeamPlayerValidator;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\BaseRepository;
use InstaScore\Platform\Repositories\OfficialRepository;
use InstaScore\Platform\Repositories\PlayerRepository;
use InstaScore\Platform\Repositories\RegistrationRepository;
use InstaScore\Platform\Repositories\SeasonRepository;
use InstaScore\Platform\Repositories\SportRepository;
use InstaScore\Platform\Repositories\TeamRepository;
use InstaScore\Platform\Repositories\VenueRepository;
use wpdb;

final class TeamPlayerService {
	public function __construct(
		private readonly wpdb $database,
		private readonly TeamPlayerValidator $validator
	) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb, new TeamPlayerValidator() );
	}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function create_team( array $input ): array {
		$data     = $this->validator->team( $input );
		$sport_id = ( new SportRepository( $this->database, 'sports' ) )->id_for_uuid( (string) $data['sport_uuid'] );
		if ( null === $sport_id ) {
			throw new ValidationException( array( 'sportUuid' => 'The selected sport does not exist.' ) );
		}
		$venue_id = null;
		if ( '' !== $data['home_venue_uuid'] ) {
			$venue_id = ( new VenueRepository( $this->database, 'venues' ) )->id_for_uuid( (string) $data['home_venue_uuid'] );
			if ( null === $venue_id ) {
				throw new ValidationException( array( 'homeVenueUuid' => 'The selected venue does not exist.' ) );
			}
		}
		$row = $this->shared(
			array(
				'uuid'                => wp_generate_uuid4(),
				'sport_id'            => $sport_id,
				'name'                => $data['name'],
				'slug'                => $data['slug'],
				'short_name'          => $data['short_name'],
				'home_venue_id'       => $venue_id,
				'logo_attachment_id'  => $data['logo']['attachment_id'],
				'logo_url'            => $data['logo']['url'],
				'logo_mime_type'      => $data['logo']['mime_type'],
				'logo_size_bytes'     => $data['logo']['size_bytes'],
				'metadata_json'       => '{}',
			)
		);
		return $this->create_audited( new TeamRepository( $this->database, 'teams' ), 'team', $row );
	}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function create_player( array $input ): array {
		$data     = $this->validator->player( $input );
		$sport_id = ( new SportRepository( $this->database, 'sports' ) )->id_for_uuid( (string) $data['sport_uuid'] );
		if ( null === $sport_id ) {
			throw new ValidationException( array( 'sportUuid' => 'The selected sport does not exist.' ) );
		}
		$row = $this->shared(
			array(
				'uuid'                => wp_generate_uuid4(),
				'sport_id'            => $sport_id,
				'first_name'          => $data['first_name'],
				'last_name'           => $data['last_name'],
				'display_name'        => $data['display_name'],
				'slug'                => $data['slug'],
				'date_of_birth'       => $data['date_of_birth'],
				'nationality'         => $data['nationality'],
				'primary_position'    => $data['primary_position'],
				'eligibility_status'  => $data['eligibility_status'],
				'photo_attachment_id' => $data['photo']['attachment_id'],
				'photo_url'           => $data['photo']['url'],
				'photo_mime_type'     => $data['photo']['mime_type'],
				'photo_size_bytes'    => $data['photo']['size_bytes'],
				'metadata_json'       => '{}',
			)
		);
		return $this->create_audited( new PlayerRepository( $this->database, 'players' ), 'player', $row );
	}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function register_player( array $input ): array {
		$data        = $this->validator->registration( $input );
		$teams       = new TeamRepository( $this->database, 'teams' );
		$players     = new PlayerRepository( $this->database, 'players' );
		$seasons     = new SeasonRepository( $this->database, 'seasons' );
		$registrations = new RegistrationRepository( $this->database, 'team_registrations' );
		$team_id     = $teams->id_for_uuid( (string) $data['team_uuid'] );
		$player_id   = $players->id_for_uuid( (string) $data['player_uuid'] );
		$season_id   = $seasons->id_for_uuid( (string) $data['season_uuid'] );
		if ( null === $team_id || null === $player_id || null === $season_id ) {
			throw new ValidationException( array( 'registration' => 'Team, player and season must exist.' ) );
		}
		if ( ! TeamPermissions::manage_registration_for_team_id( $team_id ) ) {
			throw new ValidationException( array( 'teamUuid' => 'You cannot manage this team.' ) );
		}
		if ( null !== $registrations->active_for_player_season( $player_id, $season_id ) ) {
			throw new ValidationException( array( 'playerUuid' => 'This player already has an active registration in this season.' ) );
		}
		if ( null !== $data['jersey_number'] && null !== $registrations->jersey_conflict( $team_id, $season_id, (int) $data['jersey_number'] ) ) {
			throw new ValidationException( array( 'jerseyNumber' => 'This jersey number is already active for this team and season.' ) );
		}
		$row = $this->shared(
			array(
				'uuid'               => wp_generate_uuid4(),
				'team_id'            => $team_id,
				'player_id'          => $player_id,
				'season_id'          => $season_id,
				'jersey_number'      => $data['jersey_number'],
				'position_code'      => $data['position_code'],
				'registered_at'      => gmdate( 'Y-m-d H:i:s' ),
				'unregistered_at'    => null,
				'eligibility_status' => $data['eligibility_status'],
				'notes'              => $data['notes'],
			)
		);
		return $this->create_audited( $registrations, 'team_registration', $row );
	}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function create_venue( array $input ): array {
		return $this->create_audited( new VenueRepository( $this->database, 'venues' ), 'venue', $this->shared( array_merge( array( 'uuid' => wp_generate_uuid4(), 'metadata_json' => '{}' ), $this->validator->venue( $input ) ) ) );
	}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function create_official( array $input ): array {
		return $this->create_audited( new OfficialRepository( $this->database, 'officials' ), 'official', $this->shared( array_merge( array( 'uuid' => wp_generate_uuid4(), 'metadata_json' => '{}' ), $this->validator->official( $input ) ) ) );
	}

	/** @param array<string,mixed> $input */
	public function update_team( string $uuid, array $input ): array {
		$data = $this->validator->team( $input );
		$sport_id = ( new SportRepository( $this->database, 'sports' ) )->id_for_uuid( (string) $data['sport_uuid'] );
		if ( null === $sport_id ) {
			throw new ValidationException( array( 'sportUuid' => 'The selected sport does not exist.' ) );
		}
		$changes = array( 'sport_id' => $sport_id, 'name' => $data['name'], 'slug' => $data['slug'], 'short_name' => $data['short_name'] );
		if ( array_key_exists( 'logo', $input ) ) {
			$changes = array_merge( $changes, array( 'logo_attachment_id' => $data['logo']['attachment_id'], 'logo_url' => $data['logo']['url'], 'logo_mime_type' => $data['logo']['mime_type'], 'logo_size_bytes' => $data['logo']['size_bytes'] ) );
		}
		return $this->update_audited( new TeamRepository( $this->database, 'teams' ), 'team', $uuid, $changes );
	}

	/** @param array<string,mixed> $input */
	public function update_player( string $uuid, array $input ): array {
		$data = $this->validator->player( $input );
		$sport_id = ( new SportRepository( $this->database, 'sports' ) )->id_for_uuid( (string) $data['sport_uuid'] );
		if ( null === $sport_id ) {
			throw new ValidationException( array( 'sportUuid' => 'The selected sport does not exist.' ) );
		}
		$changes = array( 'sport_id' => $sport_id, 'first_name' => $data['first_name'], 'last_name' => $data['last_name'], 'display_name' => $data['display_name'], 'slug' => $data['slug'], 'date_of_birth' => $data['date_of_birth'], 'nationality' => $data['nationality'], 'primary_position' => $data['primary_position'], 'eligibility_status' => $data['eligibility_status'] );
		if ( array_key_exists( 'photo', $input ) ) {
			$changes = array_merge( $changes, array( 'photo_attachment_id' => $data['photo']['attachment_id'], 'photo_url' => $data['photo']['url'], 'photo_mime_type' => $data['photo']['mime_type'], 'photo_size_bytes' => $data['photo']['size_bytes'] ) );
		}
		return $this->update_audited( new PlayerRepository( $this->database, 'players' ), 'player', $uuid, $changes );
	}

	/** @param array<string,mixed> $input */
	public function update_registration( string $uuid, array $input ): array {
		$data          = $this->validator->registration( $input );
		$teams         = new TeamRepository( $this->database, 'teams' );
		$players       = new PlayerRepository( $this->database, 'players' );
		$seasons       = new SeasonRepository( $this->database, 'seasons' );
		$registrations = new RegistrationRepository( $this->database, 'team_registrations' );
		$team_id       = $teams->id_for_uuid( (string) $data['team_uuid'] );
		$player_id     = $players->id_for_uuid( (string) $data['player_uuid'] );
		$season_id     = $seasons->id_for_uuid( (string) $data['season_uuid'] );
		$before        = $registrations->find_by_uuid( $uuid );
		if ( null === $before || null === $team_id || null === $player_id || null === $season_id ) {
			throw new ValidationException( array( 'registration' => 'Registration, team, player and season must exist.' ) );
		}
		if ( ! TeamPermissions::manage_registration_for_team_id( (int) $before['team_id'] ) || ! TeamPermissions::manage_registration_for_team_id( $team_id ) ) {
			throw new ValidationException( array( 'teamUuid' => 'You cannot transfer this registration.' ) );
		}
		if ( null !== $registrations->active_for_player_season( $player_id, $season_id, $uuid ) ) {
			throw new ValidationException( array( 'playerUuid' => 'This player already has another active registration in this season.' ) );
		}
		if ( null !== $data['jersey_number'] && null !== $registrations->jersey_conflict( $team_id, $season_id, (int) $data['jersey_number'], $uuid ) ) {
			throw new ValidationException( array( 'jerseyNumber' => 'This jersey number is already active for this team and season.' ) );
		}
		return $this->update_audited(
			$registrations,
			'team_registration',
			$uuid,
			array(
				'team_id'            => $team_id,
				'player_id'          => $player_id,
				'season_id'          => $season_id,
				'jersey_number'      => $data['jersey_number'],
				'position_code'      => $data['position_code'],
				'eligibility_status' => $data['eligibility_status'],
				'notes'              => $data['notes'],
			),
			'updated'
		);
	}

	/** @param array<string,mixed> $input */
	public function update_venue( string $uuid, array $input ): array {
		return $this->update_audited( new VenueRepository( $this->database, 'venues' ), 'venue', $uuid, $this->validator->venue( $input ) );
	}

	/** @param array<string,mixed> $input */
	public function update_official( string $uuid, array $input ): array {
		return $this->update_audited( new OfficialRepository( $this->database, 'officials' ), 'official', $uuid, $this->validator->official( $input ) );
	}

	public function change_status( string $entity, string $uuid, string $status ): array {
		$repositories = array(
			'teams' => array( new TeamRepository( $this->database, 'teams' ), 'team' ),
			'players' => array( new PlayerRepository( $this->database, 'players' ), 'player' ),
			'venues' => array( new VenueRepository( $this->database, 'venues' ), 'venue' ),
			'officials' => array( new OfficialRepository( $this->database, 'officials' ), 'official' ),
		);
		if ( ! isset( $repositories[ $entity ] ) || ! in_array( $status, array( 'active', 'archived' ), true ) ) {
			throw new ValidationException( array( 'status' => 'Unsupported status operation.' ) );
		}
		return $this->update_audited( $repositories[ $entity ][0], $repositories[ $entity ][1], $uuid, array( 'status' => $status ), $status );
	}

	/**
	 * @param array<int,array<string,mixed>> $rows Rows.
	 * @return array{valid:int,errors:array<int,array<string,mixed>>,preview:array<int,array<string,mixed>>}
	 */
	public function preview_registration_import( array $rows ): array {
		$seen    = array();
		$errors  = array();
		$preview = array();
		foreach ( $rows as $index => $row ) {
			try {
				$data = $this->validator->registration( $row );
				$key  = $data['player_uuid'] . ':' . $data['season_uuid'];
				$jkey = $data['team_uuid'] . ':' . $data['season_uuid'] . ':' . (string) $data['jersey_number'];
				if ( isset( $seen[ $key ] ) ) {
					throw new ValidationException( array( 'playerUuid' => 'Duplicate player-season row in import.' ) );
				}
				if ( null !== $data['jersey_number'] && isset( $seen[ $jkey ] ) ) {
					throw new ValidationException( array( 'jerseyNumber' => 'Duplicate jersey row in import.' ) );
				}
				$seen[ $key ] = true;
				$seen[ $jkey ] = true;
				$preview[]    = array_merge( array( 'row' => $index + 1 ), $data );
			} catch ( ValidationException $error ) {
				$errors[] = array(
					'row'    => $index + 1,
					'fields' => $error->errors(),
				);
			}
		}
		return array(
			'valid'   => count( $preview ),
			'errors'  => $errors,
			'preview' => $preview,
		);
	}

	/**
	 * @param array<int,array<string,mixed>> $rows Rows.
	 * @return array<string,mixed>
	 */
	public function commit_registration_import( array $rows ): array {
		$preview = $this->preview_registration_import( $rows );
		if ( array() !== $preview['errors'] ) {
			throw new ValidationException( array( 'csv' => 'Fix row-level errors before committing.' ) );
		}
		$this->database->query( 'START TRANSACTION' );
		try {
			$created = array();
			foreach ( $rows as $row ) {
				$created[] = $this->register_player( $row );
			}
			$this->database->query( 'COMMIT' );
			return array(
				'created' => count( $created ),
				'items'   => $created,
			);
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	/**
	 * @param array<string,mixed> $row Row.
	 * @return array<string,mixed>
	 */
	private function shared( array $row ): array {
		return array_merge(
			$row,
			array(
				'status'     => 'active',
				'source'     => 'internal',
				'created_by' => get_current_user_id(),
				'updated_by' => get_current_user_id(),
				'created_at' => gmdate( 'Y-m-d H:i:s' ),
				'updated_at' => gmdate( 'Y-m-d H:i:s' ),
				'revision'   => 1,
			)
		);
	}

	private function create_audited( BaseRepository $repository, string $entity, array $row ): array {
		$this->database->query( 'START TRANSACTION' );
		try {
			$created = $repository->create( $row );
			( new AuditRepository( $this->database ) )->record( $entity, (string) $row['uuid'], 'created', null, $created );
			$this->database->query( 'COMMIT' );
			return $created;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	private function update_audited( BaseRepository $repository, string $entity, string $uuid, array $changes, string $action = 'updated' ): array {
		$before = $repository->find_by_uuid( $uuid );
		if ( null === $before ) {
			throw new ValidationException( array( 'uuid' => 'The record does not exist.' ) );
		}
		$changes = array_merge( $changes, array( 'updated_by' => get_current_user_id(), 'updated_at' => gmdate( 'Y-m-d H:i:s' ), 'revision' => (int) $before['revision'] + 1 ) );
		$this->database->query( 'START TRANSACTION' );
		try {
			$after = $repository->update( $uuid, $changes );
			( new AuditRepository( $this->database ) )->record( $entity, $uuid, $action, $before, $after );
			$this->database->query( 'COMMIT' );
			return $after;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}
}
