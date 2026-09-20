<?php
/**
 * Team reads.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class TeamRepository extends BaseRepository {
	public function public_detail( string $uuid ): ?array {
		$sql = $this->database->prepare( "SELECT t.*,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug,v.name venue_name,v.city venue_city FROM {$this->table} t JOIN {$this->database->prefix}instascore_sports s ON s.id=t.sport_id LEFT JOIN {$this->database->prefix}instascore_venues v ON v.id=t.home_venue_id WHERE t.uuid=%s AND t.status='active' LIMIT 1", $uuid );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	/** @return array<int,array<string,mixed>> */
	public function active_roster( int $team_id ): array {
		$sql = $this->database->prepare( "SELECT p.uuid,p.display_name,p.photo_url,p.nationality,p.primary_position,r.uuid registration_uuid,r.jersey_number,r.position_code,r.eligibility_status,se.uuid season_uuid,se.name season_name FROM {$this->database->prefix}instascore_team_registrations r JOIN {$this->database->prefix}instascore_players p ON p.id=r.player_id JOIN {$this->database->prefix}instascore_seasons se ON se.id=r.season_id WHERE r.team_id=%d AND r.status='active' AND p.status='active' AND r.id=(SELECT latest.id FROM {$this->database->prefix}instascore_team_registrations latest WHERE latest.player_id=r.player_id AND latest.team_id=r.team_id AND latest.status='active' ORDER BY latest.registered_at DESC,latest.id DESC LIMIT 1) ORDER BY r.jersey_number,p.display_name", $team_id );
		$rows = $this->database->get_results( $sql, ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}
	/**
	 * @param array<string,mixed> $query Query.
	 * @return array{items:array<int,array<string,mixed>>,total:int}
	 */
	public function public_list( array $query ): array {
		$page     = max( 1, (int) ( $query['page'] ?? 1 ) );
		$per_page = min( 50, max( 1, (int) ( $query['perPage'] ?? 12 ) ) );
		$offset   = ( $page - 1 ) * $per_page;
		$where    = ! empty( $query['includeArchived'] ) ? array( "t.status IN ('active','archived')" ) : array( "t.status = 'active'" );
		$args     = array();
		if ( ! empty( $query['sport'] ) ) {
			$where[] = 's.slug = %s';
			$args[]  = sanitize_title( (string) $query['sport'] );
		}
		if ( ! empty( $query['search'] ) ) {
			$where[] = 't.name LIKE %s';
			$args[]  = '%' . $this->database->esc_like( sanitize_text_field( (string) $query['search'] ) ) . '%';
		}
		$join      = " FROM {$this->table} t JOIN {$this->database->prefix}instascore_sports s ON s.id = t.sport_id";
		$condition = ' WHERE ' . implode( ' AND ', $where );
		$count_sql = "SELECT COUNT(*){$join}{$condition}";
		$list_sql  = "SELECT t.*,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug{$join}{$condition} ORDER BY t.name ASC LIMIT %d OFFSET %d";
		$count     = (int) $this->database->get_var( $args ? $this->database->prepare( $count_sql, $args ) : $count_sql );
		$items     = $this->database->get_results( $this->database->prepare( $list_sql, array_merge( $args, array( $per_page, $offset ) ) ), ARRAY_A );
		return array(
			'items' => is_array( $items ) ? $items : array(),
			'total' => $count,
		);
	}
}
