<?php
/**
 * Generic sport, stage and group mutation service.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\BaseRepository;
use wpdb;

final class CatalogService {
	public function __construct( private readonly wpdb $database ) {}

	/**
	 * @param array<string,mixed> $input Input.
	 */
	public function create( string $entity, array $input ): array {
		$map = array(
			'sports' => array(
				'parent'     => null,
				'parent_key' => null,
			),
			'stages' => array(
				'parent'     => 'seasons',
				'parent_key' => 'season_id',
			),
			'groups' => array(
				'parent'     => 'stages',
				'parent_key' => 'stage_id',
			),
		);
		if ( ! isset( $map[ $entity ] ) ) {
			throw new ValidationException( array( 'entity' => 'Unsupported catalog resource.' ) );
		}
		$name = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		if ( '' === $name || mb_strlen( $name ) > 120 ) {
			throw new ValidationException( array( 'name' => 'Enter a name of 120 characters or fewer.' ) );
		}
		$row = array(
			'uuid'       => wp_generate_uuid4(),
			'name'       => $name,
			'slug'       => sanitize_title( (string) ( $input['slug'] ?? $name ) ),
			'status'     => 'active',
			'source'     => 'internal',
			'created_by' => get_current_user_id(),
			'updated_by' => get_current_user_id(),
			'created_at' => gmdate( 'Y-m-d H:i:s' ),
			'updated_at' => gmdate( 'Y-m-d H:i:s' ),
			'revision'   => 1,
		);
		if ( null !== $map[ $entity ]['parent'] ) {
			$parent_uuid = sanitize_text_field( (string) ( $input['parentUuid'] ?? '' ) );
			$parent      = new BaseRepository( $this->database, $map[ $entity ]['parent'] );
			$parent_id   = $parent->id_for_uuid( $parent_uuid );
			if ( null === $parent_id ) {
				throw new ValidationException( array( 'parentUuid' => 'The selected parent does not exist.' ) );
			}
			$row[ $map[ $entity ]['parent_key'] ] = $parent_id;
		}
		if ( 'stages' === $entity ) {
			$row['stage_type'] = sanitize_key( (string) ( $input['type'] ?? 'league' ) );
			$row['sort_order'] = max( 0, (int) ( $input['sortOrder'] ?? 0 ) );
		}
		if ( 'groups' === $entity ) {
			$row['sort_order'] = max( 0, (int) ( $input['sortOrder'] ?? 0 ) );
		}
		if ( 'sports' === $entity ) {
			$row['config_json'] = '{}';
		}
		$repository = new BaseRepository( $this->database, $entity );
		$this->database->query( 'START TRANSACTION' );
		try {
			$created = $repository->create( $row );
			( new AuditRepository( $this->database ) )->record( rtrim( $entity, 's' ), $row['uuid'], 'created', null, $created );
			$this->database->query( 'COMMIT' );
			return $created;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	/**
	 * Update a catalog record.
	 *
	 * @param array<string,mixed> $input Input.
	 */
	public function update( string $entity, string $uuid, array $input ): array {
		if ( ! in_array( $entity, array( 'sports', 'stages', 'groups' ), true ) ) {
			throw new ValidationException( array( 'entity' => 'Unsupported catalog resource.' ) );
		}
		$repository = new BaseRepository( $this->database, $entity );
		$before     = $repository->find_by_uuid( $uuid );
		$name       = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		if ( null === $before || '' === $name || mb_strlen( $name ) > 120 ) {
			throw new ValidationException( array( 'name' => 'Enter a valid existing record and name.' ) );
		}
		$changes = array(
			'name'       => $name,
			'slug'       => sanitize_title( (string) ( $input['slug'] ?? $name ) ),
			'updated_by' => get_current_user_id(),
			'updated_at' => gmdate( 'Y-m-d H:i:s' ),
			'revision'   => (int) $before['revision'] + 1,
		);
		$this->database->query( 'START TRANSACTION' );
		try {
			$after = $repository->update( $uuid, $changes );
			( new AuditRepository( $this->database ) )->record( rtrim( $entity, 's' ), $uuid, 'updated', $before, $after );
			$this->database->query( 'COMMIT' );
			return $after;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}

	public function change_status( string $entity, string $uuid, string $status ): array {
		if ( ! in_array( $entity, array( 'sports', 'stages', 'groups' ), true ) || ! in_array( $status, array( 'active', 'archived' ), true ) ) {
			throw new ValidationException( array( 'status' => 'Unsupported catalog status operation.' ) );
		}
		$repository = new BaseRepository( $this->database, $entity );
		$before     = $repository->find_by_uuid( $uuid );
		if ( null === $before ) {
			throw new ValidationException( array( 'uuid' => 'The record does not exist.' ) );
		}
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
			( new AuditRepository( $this->database ) )->record( rtrim( $entity, 's' ), $uuid, $status, $before, $after );
			$this->database->query( 'COMMIT' );
			return $after;
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			throw $error;
		}
	}
}
