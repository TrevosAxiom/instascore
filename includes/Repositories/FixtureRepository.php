<?php
/**
 * Fixture read/write repository.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class FixtureRepository extends BaseRepository {
	/**
	 * Complete fixture directory for authorized administrators.
	 *
	 * @param array<string,mixed> $query Query.
	 * @return array{items:array<int,array<string,mixed>>,total:int}
	 */
	public function admin_list( array $query = array() ): array {
		$page = max( 1, (int) ( $query['page'] ?? 1 ) );
		$per_page = min( 100, max( 1, (int) ( $query['perPage'] ?? 50 ) ) );
		$where = array( '1=1' );
		$args = array();
		if ( ! empty( $query['status'] ) ) {
			$where[] = 'f.status = %s';
			$args[] = sanitize_key( (string) $query['status'] );
		}
		if ( ! empty( $query['sport'] ) ) {
			$where[] = 'sp.slug = %s';
			$args[] = sanitize_title( (string) $query['sport'] );
		}
		if ( ! empty( $query['competition'] ) ) {
			$where[] = 'c.uuid = %s';
			$args[] = sanitize_text_field( (string) $query['competition'] );
		}
		if ( ! empty( $query['date'] ) ) {
			$where[] = 'DATE(f.kickoff_at) = %s';
			$args[] = sanitize_text_field( (string) $query['date'] );
		}
		if ( ! empty( $query['search'] ) ) {
			$where[] = '(ht.name LIKE %s OR at.name LIKE %s OR c.name LIKE %s)';
			$like = '%' . $this->database->esc_like( sanitize_text_field( (string) $query['search'] ) ) . '%';
			$args = array_merge( $args, array( $like, $like, $like ) );
		}
		$join = $this->joins();
		$condition = ' WHERE ' . implode( ' AND ', $where );
		$select = "SELECT f.*,c.uuid competition_uuid,c.name competition_name,s.uuid season_uuid,s.name season_name,sp.uuid sport_uuid,sp.name sport_name,sp.slug sport_slug,ht.uuid home_team_uuid,ht.name home_team_name,at.uuid away_team_uuid,at.name away_team_name,v.uuid venue_uuid,v.name venue_name{$join}{$condition}";
		$count = (int) $this->database->get_var( $args ? $this->database->prepare( "SELECT COUNT(*){$join}{$condition}", $args ) : "SELECT COUNT(*){$join}{$condition}" );
		$rows = $this->database->get_results( $this->database->prepare( "{$select} ORDER BY f.kickoff_at DESC, f.id DESC LIMIT %d OFFSET %d", array_merge( $args, array( $per_page, ( $page - 1 ) * $per_page ) ) ), ARRAY_A );
		return array( 'items' => is_array( $rows ) ? $rows : array(), 'total' => $count );
	}
	/**
	 * @param array<string,mixed> $query Query.
	 * @return array{items:array<int,array<string,mixed>>,total:int}
	 */
	public function public_list( array $query ): array {
		$page     = max( 1, (int) ( $query['page'] ?? 1 ) );
		$per_page = min( 50, max( 1, (int) ( $query['perPage'] ?? 12 ) ) );
		$offset   = ( $page - 1 ) * $per_page;
		$where    = array( "f.status IN ('scheduled','warmup','live','halftime','interval','suspended','postponed','completed','confirmed')" );
		$args     = array();
		if ( ! empty( $query['results'] ) ) {
			$where = array( "f.status IN ('completed','confirmed','abandoned')" );
		}
		if ( ! empty( $query['date'] ) ) {
			$where[] = 'DATE(f.kickoff_at) = %s';
			$args[]  = sanitize_text_field( (string) $query['date'] );
		}
		if ( ! empty( $query['sport'] ) ) {
			$where[] = 'sp.slug = %s';
			$args[]  = sanitize_title( (string) $query['sport'] );
		}
		if ( ! empty( $query['competition'] ) ) {
			$where[] = 'c.uuid = %s';
			$args[]  = sanitize_text_field( (string) $query['competition'] );
		}
		$join = $this->joins();
		$cond = ' WHERE ' . implode( ' AND ', $where );
		$sql  = "SELECT f.*,c.uuid competition_uuid,c.name competition_name,s.uuid season_uuid,s.name season_name,sp.uuid sport_uuid,sp.name sport_name,sp.slug sport_slug,ht.uuid home_team_uuid,ht.name home_team_name,at.uuid away_team_uuid,at.name away_team_name,v.uuid venue_uuid,v.name venue_name{$join}{$cond}";
		$count = (int) $this->database->get_var( $args ? $this->database->prepare( "SELECT COUNT(*){$join}{$cond}", $args ) : "SELECT COUNT(*){$join}{$cond}" );
		$rows  = $this->database->get_results( $this->database->prepare( "{$sql} ORDER BY f.kickoff_at ASC, f.id ASC LIMIT %d OFFSET %d", array_merge( $args, array( $per_page, $offset ) ) ), ARRAY_A );
		return array(
			'items' => is_array( $rows ) ? $rows : array(),
			'total' => $count,
		);
	}

	public function find_public_by_uuid( string $uuid ): ?array {
		$sql = $this->database->prepare(
			'SELECT f.*,c.uuid competition_uuid,c.name competition_name,s.uuid season_uuid,s.name season_name,sp.uuid sport_uuid,sp.name sport_name,sp.slug sport_slug,ht.uuid home_team_uuid,ht.name home_team_name,at.uuid away_team_uuid,at.name away_team_name,v.uuid venue_uuid,v.name venue_name' . $this->joins() . ' WHERE f.uuid = %s LIMIT 1',
			$uuid
		);
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	public function conflicts( string $kickoff_at, int $home_team_id, int $away_team_id, ?int $venue_id, array $official_ids, ?string $except_uuid = null ): array {
		$args  = array( $home_team_id, $home_team_id, $away_team_id, $away_team_id, $kickoff_at );
		$where = "(f.home_team_id IN (%d,%d) OR f.away_team_id IN (%d,%d)) AND ABS(TIMESTAMPDIFF(MINUTE, f.kickoff_at, %s)) < 150 AND f.status NOT IN ('cancelled','abandoned')";
		if ( null !== $venue_id ) {
			$where .= ' OR (f.venue_id = %d AND ABS(TIMESTAMPDIFF(MINUTE, f.kickoff_at, %s)) < 150)';
			$args[] = $venue_id;
			$args[] = $kickoff_at;
		}
		if ( array() !== $official_ids ) {
			$placeholders = implode( ',', array_fill( 0, count( $official_ids ), '%d' ) );
			$where       .= " OR (fo.official_id IN ({$placeholders}) AND ABS(TIMESTAMPDIFF(MINUTE, f.kickoff_at, %s)) < 150)";
			$args         = array_merge( $args, $official_ids, array( $kickoff_at ) );
		}
		$sql = "SELECT DISTINCT f.uuid,f.kickoff_at,f.status FROM {$this->table} f LEFT JOIN {$this->database->prefix}instascore_fixture_officials fo ON fo.fixture_id = f.id WHERE ({$where})";
		if ( null !== $except_uuid ) {
			$sql   .= ' AND f.uuid <> %s';
			$args[] = $except_uuid;
		}
		$rows = $this->database->get_results( $this->database->prepare( $sql, $args ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	private function joins(): string {
		$prefix = $this->database->prefix . 'instascore_';
		return " FROM {$this->table} f JOIN {$prefix}competitions c ON c.id = f.competition_id JOIN {$prefix}sports sp ON sp.id = c.sport_id JOIN {$prefix}seasons s ON s.id = f.season_id JOIN {$prefix}teams ht ON ht.id = f.home_team_id JOIN {$prefix}teams at ON at.id = f.away_team_id LEFT JOIN {$prefix}venues v ON v.id = f.venue_id";
	}
}
