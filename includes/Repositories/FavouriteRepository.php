<?php
/**
 * User favourites, preferences and search storage.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class FavouriteRepository extends BaseRepository {
	public function __construct( \wpdb $database ) {
		parent::__construct( $database, 'user_favourites' );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function list_for_user( int $user_id ): array {
		$table = $this->database->prefix . 'instascore_user_favourites';
		$rows  = $this->database->get_results(
			$this->database->prepare( "SELECT * FROM {$table} WHERE user_id = %d AND status = 'active' ORDER BY updated_at DESC", $user_id ),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public function follow( int $user_id, string $entity_type, string $entity_uuid, string $source = 'server' ): array {
		$row = array(
			'uuid'           => wp_generate_uuid4(),
			'user_id'        => $user_id,
			'entity_type'    => sanitize_key( $entity_type ),
			'entity_uuid'    => sanitize_text_field( $entity_uuid ),
			'status'         => 'active',
			'source'         => sanitize_key( $source ),
			'alerts_enabled' => 1,
			'unfollowed_at'  => null,
			'created_at'     => gmdate( 'Y-m-d H:i:s' ),
			'updated_at'     => gmdate( 'Y-m-d H:i:s' ),
		);

		$this->database->replace(
			$this->database->prefix . 'instascore_user_favourites',
			$row,
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%s' )
		);

		return $row;
	}

	public function unfollow( int $user_id, string $entity_type, string $entity_uuid ): void {
		$this->database->update(
			$this->database->prefix . 'instascore_user_favourites',
			array(
				'status'         => 'unfollowed',
				'alerts_enabled' => 0,
				'unfollowed_at'  => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'     => gmdate( 'Y-m-d H:i:s' ),
			),
			array(
				'user_id'     => $user_id,
				'entity_type' => sanitize_key( $entity_type ),
				'entity_uuid' => sanitize_text_field( $entity_uuid ),
			),
			array( '%s', '%d', '%s', '%s' ),
			array( '%d', '%s', '%s' )
		);
	}

	/**
	 * @param array<int,array<string,string>> $favourites Local favourites.
	 */
	public function merge( int $user_id, array $favourites ): array {
		$merged = array();
		foreach ( $favourites as $favourite ) {
			$type = sanitize_key( (string) ( $favourite['entityType'] ?? '' ) );
			$uuid = sanitize_text_field( (string) ( $favourite['entityUuid'] ?? '' ) );
			if ( $this->valid_entity( $type, $uuid ) ) {
				$merged[] = $this->follow( $user_id, $type, $uuid, 'anonymous_migration' );
			}
		}
		return $merged;
	}

	/**
	 * @return array<string,mixed>
	 */
	public function preferences( int $user_id ): array {
		$table = $this->database->prefix . 'instascore_user_preferences';
		$row   = $this->database->get_row(
			$this->database->prepare( "SELECT * FROM {$table} WHERE user_id = %d LIMIT 1", $user_id ),
			ARRAY_A
		);

		if ( ! is_array( $row ) ) {
			return array(
				'timezone'        => wp_timezone_string(),
				'language'        => 'en',
				'preferredSports' => array( 'flag-football', 'football', 'basketball' ),
			);
		}

		$sports = json_decode( (string) $row['preferred_sports_json'], true );
		return array(
			'timezone'        => (string) $row['timezone'],
			'language'        => (string) $row['language'],
			'preferredSports' => is_array( $sports ) ? $sports : array(),
		);
	}

	/**
	 * @param array<string,mixed> $input Preference input.
	 */
	public function save_preferences( int $user_id, array $input ): array {
		$sports = array_values( array_filter( array_map( 'sanitize_key', (array) ( $input['preferredSports'] ?? array() ) ) ) );
		$row    = array(
			'uuid'                  => wp_generate_uuid4(),
			'user_id'               => $user_id,
			'timezone'              => sanitize_text_field( (string) ( $input['timezone'] ?? wp_timezone_string() ) ),
			'language'              => sanitize_key( (string) ( $input['language'] ?? 'en' ) ),
			'preferred_sports_json' => wp_json_encode( $sports ) ?: '[]',
			'privacy_version'       => '1',
			'updated_at'            => gmdate( 'Y-m-d H:i:s' ),
		);

		$this->database->replace(
			$this->database->prefix . 'instascore_user_preferences',
			$row,
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
		);

		return $this->preferences( $user_id );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function alerts( int $user_id ): array {
		$rows = $this->database->get_results(
			$this->database->prepare(
				"SELECT * FROM {$this->database->prefix}instascore_alert_history WHERE user_id = %d ORDER BY created_at DESC LIMIT 50",
				$user_id
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function search( string $term ): array {
		$like   = '%' . $this->database->esc_like( $term ) . '%';
		$prefix = $this->database->prefix . 'instascore_';
		$items  = array();

		foreach ( array(
			array( 'competition', 'competitions', 'name', '/competitions/' ),
			array( 'team', 'teams', 'name', '/teams/' ),
			array( 'player', 'players', 'display_name', '/players/' ),
			array( 'fixture', 'fixtures', 'round_name', '/fixtures/' ),
		) as $config ) {
			$rows = $this->database->get_results(
				$this->database->prepare(
					"SELECT uuid, {$config[2]} label FROM {$prefix}{$config[1]} WHERE {$config[2]} LIKE %s LIMIT 10",
					$like
				),
				ARRAY_A
			);
			foreach ( is_array( $rows ) ? $rows : array() as $row ) {
				$items[] = array(
					'type'  => $config[0],
					'uuid'  => $row['uuid'],
					'label' => $row['label'],
					'url'   => $config[3] . $row['uuid'],
				);
			}
		}

		return $items;
	}

	private function valid_entity( string $type, string $uuid ): bool {
		return in_array( $type, array( 'team', 'competition', 'player' ), true ) && wp_is_uuid( $uuid );
	}
}
