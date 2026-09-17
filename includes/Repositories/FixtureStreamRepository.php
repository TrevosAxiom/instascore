<?php
/**
 * Fixture livestream persistence.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use wpdb;

final class FixtureStreamRepository {
	private readonly string $table;
	public function __construct( private readonly wpdb $database ) {
		$this->table = $database->prefix . 'instascore_fixture_streams';
	}

	public function fixture_id( string $fixture_uuid ): ?int {
		$value = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$this->database->prefix}instascore_fixtures WHERE uuid = %s LIMIT 1", $fixture_uuid ) );
		return null === $value ? null : (int) $value;
	}

	public function for_fixture( string $fixture_uuid ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare( "SELECT fs.* FROM {$this->table} fs JOIN {$this->database->prefix}instascore_fixtures f ON f.id = fs.fixture_id WHERE f.uuid = %s AND fs.provider = 'youtube' LIMIT 1", $fixture_uuid ),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	public function save( int $fixture_id, array $values ): array {
		$existing = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->table} WHERE fixture_id = %d AND provider = 'youtube' LIMIT 1", $fixture_id ), ARRAY_A );
		$now      = gmdate( 'Y-m-d H:i:s' );
		if ( is_array( $existing ) ) {
			$values['updated_at'] = $now;
			$this->database->update( $this->table, $values, array( 'id' => (int) $existing['id'] ) );
			return array_merge( $existing, $values );
		}
		$row = array_merge( $values, array(
			'uuid' => wp_generate_uuid4(), 'fixture_id' => $fixture_id, 'provider' => 'youtube',
			'created_at' => $now, 'updated_at' => $now,
		) );
		$this->database->insert( $this->table, $row );
		$row['id'] = (int) $this->database->insert_id;
		return $row;
	}

	public function disable( string $fixture_uuid ): ?array {
		$row = $this->for_fixture( $fixture_uuid );
		if ( null === $row ) { return null; }
		$this->database->update( $this->table, array( 'status' => 'cancelled', 'embed_enabled' => 0, 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'id' => (int) $row['id'] ) );
		$row['status'] = 'cancelled'; $row['embed_enabled'] = 0;
		return $row;
	}

	/** @return array<int,array<string,mixed>> */
	public function youtube_streams_for_sync(): array {
		$rows = $this->database->get_results( "SELECT fs.*,f.uuid fixture_uuid FROM {$this->table} fs JOIN {$this->database->prefix}instascore_fixtures f ON f.id = fs.fixture_id WHERE fs.provider = 'youtube' AND fs.status NOT IN ('cancelled','failed') ORDER BY fs.updated_at ASC", ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public function synchronize_youtube( int $id, array $broadcast ): void {
		$datetime = static function ( mixed $value ): ?string {
			if ( ! is_string( $value ) || '' === $value ) { return null; }
			$timestamp = strtotime( $value );
			return false === $timestamp ? null : gmdate( 'Y-m-d H:i:s', $timestamp );
		};
		$now = gmdate( 'Y-m-d H:i:s' );
		$this->database->update( $this->table, array(
			'title' => sanitize_text_field( (string) ( $broadcast['title'] ?? '' ) ),
			'status' => sanitize_key( (string) ( $broadcast['status'] ?? 'scheduled' ) ),
			'visibility' => sanitize_key( (string) ( $broadcast['visibility'] ?? 'unlisted' ) ),
			'embed_enabled' => empty( $broadcast['embedEnabled'] ) ? 0 : 1,
			'replay_available' => 'replay_available' === ( $broadcast['status'] ?? '' ) ? 1 : 0,
			'thumbnail_url' => esc_url_raw( (string) ( $broadcast['thumbnailUrl'] ?? '' ) ),
			'scheduled_start' => $datetime( $broadcast['scheduledStart'] ?? null ),
			'actual_start' => $datetime( $broadcast['actualStart'] ?? null ),
			'actual_end' => $datetime( $broadcast['actualEnd'] ?? null ),
			'last_synced_at' => $now, 'error_message' => null, 'updated_at' => $now,
		), array( 'id' => $id ) );
	}

	/** @return array<int,array<string,mixed>> */
	public function youtube_health_rows(): array {
		$rows = $this->database->get_results(
			"SELECT fs.*,f.uuid fixture_uuid,ht.name home_team_name,at.name away_team_name FROM {$this->table} fs JOIN {$this->database->prefix}instascore_fixtures f ON f.id = fs.fixture_id JOIN {$this->database->prefix}instascore_teams ht ON ht.id = f.home_team_id JOIN {$this->database->prefix}instascore_teams at ON at.id = f.away_team_id WHERE fs.provider = 'youtube' ORDER BY fs.updated_at DESC LIMIT 100",
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public function mark_youtube_sync_failure( string $message ): void {
		$this->database->query(
			$this->database->prepare(
				"UPDATE {$this->table} SET error_message = %s, updated_at = %s WHERE provider = 'youtube' AND status NOT IN ('cancelled','failed')",
				sanitize_text_field( $message ),
				gmdate( 'Y-m-d H:i:s' )
			)
		);
	}

	/** @return array<int,array<string,mixed>> */
	public function fixture_candidates_for_youtube(): array {
		$from = gmdate( 'Y-m-d H:i:s', time() - 2 * DAY_IN_SECONDS );
		$to   = gmdate( 'Y-m-d H:i:s', time() + 30 * DAY_IN_SECONDS );
		$sql  = "SELECT f.id,f.uuid,f.kickoff_at,f.status,c.name competition_name,ht.name home_team_name,at.name away_team_name,fs.external_broadcast_id
			FROM {$this->database->prefix}instascore_fixtures f
			JOIN {$this->database->prefix}instascore_competitions c ON c.id = f.competition_id
			JOIN {$this->database->prefix}instascore_teams ht ON ht.id = f.home_team_id
			JOIN {$this->database->prefix}instascore_teams at ON at.id = f.away_team_id
			LEFT JOIN {$this->table} fs ON fs.fixture_id = f.id AND fs.provider = 'youtube'
			WHERE f.kickoff_at BETWEEN %s AND %s AND f.status NOT IN ('draft','cancelled','abandoned','confirmed')
			ORDER BY f.kickoff_at ASC";
		$rows = $this->database->get_results( $this->database->prepare( $sql, $from, $to ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	/** @return array<int,string> */
	public function assigned_youtube_video_ids(): array {
		$values = $this->database->get_col( "SELECT external_broadcast_id FROM {$this->table} WHERE provider = 'youtube' AND status <> 'cancelled'" );
		return array_values( array_filter( array_map( 'strval', is_array( $values ) ? $values : array() ) ) );
	}
}
