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
		return array_map( array( $this, 'present_favourite' ), is_array( $rows ) ? $rows : array() );
	}

	public function follow( int $user_id, string $entity_type, string $entity_uuid, string $source = 'server' ): array {
		if ( ! $this->valid_entity( $entity_type, $entity_uuid ) ) {
			throw new \InvalidArgumentException( 'The selected favourite no longer exists.' );
		}
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

		return $this->present_favourite( $row );
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
		if ( mb_strlen( trim( $term ) ) < 2 ) return array();
		$like   = '%' . $this->database->esc_like( $term ) . '%';
		$prefix = $this->database->prefix . 'instascore_';
		$items  = array();

		foreach ( array(
			array( 'competition', 'competitions', 'name', '/competitions/' ),
			array( 'team', 'teams', 'name', '/teams/' ),
			array( 'player', 'players', 'display_name', '/players/' ),
		) as $config ) {
			$rows = $this->database->get_results(
				$this->database->prepare(
					"SELECT uuid, {$config[2]} label FROM {$prefix}{$config[1]} WHERE status='active' AND {$config[2]} LIKE %s LIMIT 8",
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
		$fixtures = $this->database->get_results(
			$this->database->prepare( "SELECT f.uuid,CONCAT(ht.name,' vs ',at.name) label,f.kickoff_at,c.name competition FROM {$prefix}fixtures f JOIN {$prefix}teams ht ON ht.id=f.home_team_id JOIN {$prefix}teams at ON at.id=f.away_team_id JOIN {$prefix}competitions c ON c.id=f.competition_id WHERE f.status NOT IN ('draft','cancelled') AND (ht.name LIKE %s OR at.name LIKE %s OR c.name LIKE %s) ORDER BY f.kickoff_at DESC LIMIT 8", $like, $like, $like ),
			ARRAY_A
		);
		foreach ( is_array( $fixtures ) ? $fixtures : array() as $row ) {
			$items[] = array( 'type' => 'fixture', 'uuid' => $row['uuid'], 'label' => $row['label'], 'description' => $row['competition'] . ' · ' . $row['kickoff_at'], 'url' => '/fixtures/' . $row['uuid'] );
		}

		return array_slice( $items, 0, 30 );
	}

	private function valid_entity( string $type, string $uuid ): bool {
		if ( ! in_array( $type, array( 'team', 'competition', 'player' ), true ) || ! wp_is_uuid( $uuid ) ) return false;
		$table = array( 'team' => 'teams', 'competition' => 'competitions', 'player' => 'players' )[ $type ];
		return (bool) $this->database->get_var( $this->database->prepare( "SELECT COUNT(*) FROM {$this->database->prefix}instascore_{$table} WHERE uuid=%s AND status='active'", $uuid ) );
	}

	/** @param array<string,mixed> $row @return array<string,mixed> */
	private function present_favourite( array $row ): array {
		$type = (string) $row['entity_type']; $uuid = (string) $row['entity_uuid'];
		$config = array( 'team' => array( 'teams', 'name', 'logo_url', '/teams/' ), 'competition' => array( 'competitions', 'name', 'logo_url', '/competitions/' ), 'player' => array( 'players', 'display_name', 'photo_url', '/players/' ) );
		if ( ! isset( $config[ $type ] ) ) return $row;
		$item = $this->database->get_row( $this->database->prepare( "SELECT {$config[$type][1]} label,{$config[$type][2]} image_url FROM {$this->database->prefix}instascore_{$config[$type][0]} WHERE uuid=%s LIMIT 1", $uuid ), ARRAY_A );
		return array_merge( $row, array( 'entityType' => $type, 'entityUuid' => $uuid, 'label' => is_array( $item ) ? (string) $item['label'] : 'Saved favourite', 'imageUrl' => is_array( $item ) && $item['image_url'] ? (string) $item['image_url'] : null, 'url' => $config[ $type ][3] . $uuid ) );
	}

	/** @param array<int,array<string,mixed>> $favourites @return array<int,array<string,mixed>> */
	public function fixture_feed( array $favourites ): array {
		$teams = array(); $competitions = array(); $players = array();
		foreach ( $favourites as $item ) { $type = (string) ( $item['entityType'] ?? $item['entity_type'] ?? '' ); $uuid = (string) ( $item['entityUuid'] ?? $item['entity_uuid'] ?? '' ); if ( 'team' === $type ) $teams[] = $uuid; elseif ( 'competition' === $type ) $competitions[] = $uuid; elseif ( 'player' === $type ) $players[] = $uuid; }
		if ( array() === $teams && array() === $competitions && array() === $players ) return array();
		$clauses = array(); $args = array();
		foreach ( $teams as $uuid ) { $clauses[] = '(ht.uuid=%s OR at.uuid=%s)'; array_push( $args, $uuid, $uuid ); }
		foreach ( $competitions as $uuid ) { $clauses[] = 'c.uuid=%s'; $args[] = $uuid; }
		foreach ( $players as $uuid ) { $clauses[] = 'EXISTS (SELECT 1 FROM ' . $this->database->prefix . 'instascore_players fp JOIN ' . $this->database->prefix . 'instascore_team_registrations fr ON fr.player_id=fp.id AND fr.status=\'active\' WHERE fp.uuid=%s AND fr.team_id IN (f.home_team_id,f.away_team_id))'; $args[] = $uuid; }
		$prefix = $this->database->prefix . 'instascore_';
		$sql = "SELECT f.uuid,f.status,f.kickoff_at kickoffAt,ht.name homeTeam,at.name awayTeam,c.name competition,c.uuid competitionUuid,s.slug sportSlug FROM {$prefix}fixtures f JOIN {$prefix}teams ht ON ht.id=f.home_team_id JOIN {$prefix}teams at ON at.id=f.away_team_id JOIN {$prefix}competitions c ON c.id=f.competition_id JOIN {$prefix}sports s ON s.id=c.sport_id WHERE f.status NOT IN ('draft','cancelled') AND (" . implode( ' OR ', $clauses ) . ") AND f.kickoff_at BETWEEN DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY) AND DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 DAY) ORDER BY CASE WHEN f.status IN ('live','halftime','interval') THEN 0 WHEN f.kickoff_at>=UTC_TIMESTAMP() THEN 1 ELSE 2 END,f.kickoff_at ASC LIMIT 30";
		$rows = $this->database->get_results( $this->database->prepare( $sql, $args ), ARRAY_A );
		return array_map( static fn( array $row ): array => array_merge( $row, array( 'type' => 'fixture', 'title' => $row['homeTeam'] . ' vs ' . $row['awayTeam'], 'url' => '/fixtures/' . $row['uuid'] ) ), is_array( $rows ) ? $rows : array() );
	}

	/** @param array<int,array<string,mixed>> $favourites @return array<int,array<string,mixed>> */
	public function suggestions( array $favourites ): array {
		$excluded = array_map( static fn( array $item ): string => (string) ( $item['entityUuid'] ?? $item['entity_uuid'] ?? '' ), $favourites );
		$rows = $this->database->get_results( "SELECT entity_type,entity_uuid,COUNT(*) followers FROM {$this->database->prefix}instascore_user_favourites WHERE status='active' GROUP BY entity_type,entity_uuid ORDER BY followers DESC LIMIT 20", ARRAY_A );
		$suggestions = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) { if ( in_array( $row['entity_uuid'], $excluded, true ) ) continue; $resolved = $this->present_favourite( array( 'entity_type' => $row['entity_type'], 'entity_uuid' => $row['entity_uuid'] ) ); if ( 'Saved favourite' !== $resolved['label'] ) $suggestions[] = array( 'type' => $row['entity_type'], 'uuid' => $row['entity_uuid'], 'label' => $resolved['label'], 'url' => $resolved['url'], 'reason' => 'Popular on InstaScore' ); if ( count( $suggestions ) >= 6 ) break; }
		return $suggestions;
	}
}
