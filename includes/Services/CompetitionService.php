<?php
/**
 * Competition mutation service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\CompetitionValidator;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\CompetitionRepository;
use InstaScore\Platform\Repositories\SeasonRepository;
use InstaScore\Platform\Repositories\SportRepository;
use wpdb;

final class CompetitionService {
	public function __construct(
		private readonly wpdb $database,
		private readonly SportRepository $sports,
		private readonly CompetitionRepository $competitions,
		private readonly SeasonRepository $seasons,
		private readonly AuditRepository $audit,
		private readonly CompetitionValidator $validator
	) {}

	public static function create(): self {
		global $wpdb;
		return new self(
			$wpdb,
			new SportRepository( $wpdb, 'sports' ),
			new CompetitionRepository( $wpdb, 'competitions' ),
			new SeasonRepository( $wpdb, 'seasons' ),
			new AuditRepository( $wpdb ),
			new CompetitionValidator()
		);
	}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function create_competition( array $input ): array {
		$data     = $this->validator->competition( $input );
		$sport_id = $this->sports->id_for_uuid( (string) $data['sport_uuid'] );
		if ( null === $sport_id ) {
			throw new ValidationException( array( 'sportUuid' => 'The selected sport does not exist.' ) );
		}
		$now  = gmdate( 'Y-m-d H:i:s' );
		$uuid = wp_generate_uuid4();
		$row  = array(
			'uuid'             => $uuid,
			'sport_id'         => $sport_id,
			'name'             => $data['name'],
			'slug'             => $data['slug'],
			'competition_type' => $data['type'],
			'description'      => $data['description'],
			'country_code'     => '' === $data['country'] ? null : $data['country'],
			'rules_json'       => wp_json_encode( $data['rules'] ),
			'logo_attachment_id' => $data['logo']['attachment_id'],
			'logo_url'           => $data['logo']['url'],
			'logo_mime_type'     => $data['logo']['mime_type'],
			'logo_size_bytes'    => $data['logo']['size_bytes'],
			'status'           => 'active',
			'source'           => 'internal',
			'created_by'       => get_current_user_id(),
			'updated_by'       => get_current_user_id(),
			'created_at'       => $now,
			'updated_at'       => $now,
			'revision'         => 1,
		);
		return $this->transaction(
			function () use ( $row, $uuid ): array {
				$created = $this->competitions->create( $row );
				$this->audit->record( 'competition', $uuid, 'created', null, $created );
				return $created;
			}
		);
	}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function create_season( string $competition_uuid, array $input ): array {
		$competition = $this->competitions->find_by_uuid( $competition_uuid );
		if ( null === $competition || 'archived' === $competition['status'] ) {
			throw new ValidationException( array( 'competitionUuid' => 'The competition is unavailable.' ) );
		}
		$data = $this->validator->season( $input );
		if ( $this->seasons->overlaps( (int) $competition['id'], $data['start_date'], $data['end_date'] ) ) {
			throw new ValidationException( array( 'startDate' => 'This season overlaps an existing active season.' ) );
		}
		$now  = gmdate( 'Y-m-d H:i:s' );
		$uuid = wp_generate_uuid4();
		$row  = array(
			'uuid'           => $uuid,
			'competition_id' => (int) $competition['id'],
			'name'           => $data['name'],
			'slug'           => $data['slug'],
			'start_date'     => $data['start_date'],
			'end_date'       => $data['end_date'],
			'status'         => 'active',
			'source'         => 'internal',
			'created_by'     => get_current_user_id(),
			'updated_by'     => get_current_user_id(),
			'created_at'     => $now,
			'updated_at'     => $now,
			'revision'       => 1,
		);
		return $this->transaction(
			function () use ( $row, $uuid ): array {
				$created = $this->seasons->create( $row );
				$this->audit->record( 'season', $uuid, 'created', null, $created );
				return $created;
			}
		);
	}

	/**
	 * Update a competition.
	 *
	 * @param array<string,mixed> $input Input.
	 */
	public function update_competition( string $uuid, array $input ): array {
		$before = $this->competitions->find_by_uuid( $uuid );
		if ( null === $before ) {
			throw new ValidationException( array( 'uuid' => 'The competition does not exist.' ) );
		}
		$data     = $this->validator->competition( $input );
		$sport_id = $this->sports->id_for_uuid( (string) $data['sport_uuid'] );
		if ( null === $sport_id ) {
			throw new ValidationException( array( 'sportUuid' => 'The selected sport does not exist.' ) );
		}
		$changes = array(
			'sport_id'         => $sport_id,
			'name'             => $data['name'],
			'slug'             => $data['slug'],
			'competition_type' => $data['type'],
			'description'      => $data['description'],
			'country_code'     => '' === $data['country'] ? null : $data['country'],
			'rules_json'       => wp_json_encode( $data['rules'] ),
			'updated_by'       => get_current_user_id(),
			'updated_at'       => gmdate( 'Y-m-d H:i:s' ),
			'revision'         => (int) $before['revision'] + 1,
		);
		if ( array_key_exists( 'logo', $input ) ) {
			$changes['logo_attachment_id'] = $data['logo']['attachment_id'];
			$changes['logo_url']           = $data['logo']['url'];
			$changes['logo_mime_type']     = $data['logo']['mime_type'];
			$changes['logo_size_bytes']    = $data['logo']['size_bytes'];
		}
		return $this->transaction(
			function () use ( $uuid, $changes, $before ): array {
				$after = $this->competitions->update( $uuid, $changes );
				$this->audit->record( 'competition', $uuid, 'updated', $before, $after );
				return $after;
			}
		);
	}

	/**
	 * Update a season.
	 *
	 * @param array<string,mixed> $input Input.
	 */
	public function update_season( string $uuid, array $input ): array {
		$before = $this->seasons->find_by_uuid( $uuid );
		if ( null === $before ) {
			throw new ValidationException( array( 'uuid' => 'The season does not exist.' ) );
		}
		$data = $this->validator->season( $input );
		if ( $this->seasons->overlaps( (int) $before['competition_id'], $data['start_date'], $data['end_date'], $uuid ) ) {
			throw new ValidationException( array( 'startDate' => 'This season overlaps an existing active season.' ) );
		}
		$changes = array_merge(
			$data,
			array(
				'updated_by' => get_current_user_id(),
				'updated_at' => gmdate( 'Y-m-d H:i:s' ),
				'revision'   => (int) $before['revision'] + 1,
			)
		);
		return $this->transaction(
			function () use ( $uuid, $changes, $before ): array {
				$after = $this->seasons->update( $uuid, $changes );
				$this->audit->record( 'season', $uuid, 'updated', $before, $after );
				return $after;
			}
		);
	}

	public function set_default_season( string $competition_uuid, string $season_uuid ): array {
		$before = $this->competitions->find_by_uuid( $competition_uuid );
		$season = $this->seasons->find_by_uuid( $season_uuid );
		if ( null === $before || null === $season || (int) $season['competition_id'] !== (int) $before['id'] || 'active' !== $season['status'] ) {
			throw new ValidationException( array( 'seasonUuid' => 'Choose an active season from this competition.' ) );
		}
		$rules                        = json_decode( (string) ( $before['rules_json'] ?? '{}' ), true );
		$rules                        = is_array( $rules ) ? $rules : array();
		$rules['default_season_uuid'] = $season_uuid;
		$changes                      = array(
			'rules_json' => wp_json_encode( $rules ),
			'updated_by' => get_current_user_id(),
			'updated_at' => gmdate( 'Y-m-d H:i:s' ),
			'revision'   => (int) $before['revision'] + 1,
		);
		return $this->transaction(
			function () use ( $competition_uuid, $changes, $before ): array {
				$after = $this->competitions->update( $competition_uuid, $changes );
				$this->audit->record( 'competition', $competition_uuid, 'default_season_updated', $before, $after );
				return $after;
			}
		);
	}

	public function change_status( string $entity, string $uuid, string $status ): array {
		$repositories = array(
			'competitions' => $this->competitions,
			'seasons'      => $this->seasons,
		);
		if ( ! isset( $repositories[ $entity ] ) || ! in_array( $status, array( 'active', 'archived' ), true ) ) {
			throw new ValidationException( array( 'status' => 'Unsupported status operation.' ) );
		}
		$repository = $repositories[ $entity ];
		$before     = $repository->find_by_uuid( $uuid );
		if ( null === $before ) {
			throw new ValidationException( array( 'uuid' => 'The record does not exist.' ) );
		}
		$changes = array(
			'status'      => $status,
			'archived_at' => 'archived' === $status ? gmdate( 'Y-m-d H:i:s' ) : null,
			'updated_at'  => gmdate( 'Y-m-d H:i:s' ),
			'updated_by'  => get_current_user_id(),
			'revision'    => (int) $before['revision'] + 1,
		);
		return $this->transaction(
			function () use ( $repository, $uuid, $changes, $before, $entity, $status ): array {
				$after = $repository->update( $uuid, $changes );
				$this->audit->record( rtrim( $entity, 's' ), $uuid, $status, $before, $after );
				return $after;
			}
		);
	}

	private function transaction( callable $callback ): array {
		$this->database->query( 'START TRANSACTION' );
		try {
			$result = $callback();
			$this->database->query( 'COMMIT' );
			return $result;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}
}
