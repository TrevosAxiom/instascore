<?php
/**
 * Player reads.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class PlayerRepository extends BaseRepository {
	/**
	 * @param array<string,mixed> $query Query.
	 * @return array{items:array<int,array<string,mixed>>,total:int}
	 */
	public function public_list( array $query ): array {
		$page     = max( 1, (int) ( $query['page'] ?? 1 ) );
		$per_page = min( 50, max( 1, (int) ( $query['perPage'] ?? 12 ) ) );
		$offset   = ( $page - 1 ) * $per_page;
		$where    = ! empty( $query['includeArchived'] ) ? array( "p.status IN ('active','archived')" ) : array( "p.status = 'active'" );
		$args     = array();
		if ( ! empty( $query['sport'] ) ) {
			$where[] = 's.slug = %s';
			$args[]  = sanitize_title( (string) $query['sport'] );
		}
		if ( ! empty( $query['search'] ) ) {
			$where[] = '(p.display_name LIKE %s OR p.first_name LIKE %s OR p.last_name LIKE %s OR t.name LIKE %s OR r.jersey_number LIKE %s)';
			$term    = '%' . $this->database->esc_like( sanitize_text_field( (string) $query['search'] ) ) . '%';
			array_push( $args, $term, $term, $term, $term, $term );
		}
		if ( ! empty( $query['team'] ) ) {
			$where[] = 't.uuid = %s';
			$args[]  = sanitize_text_field( (string) $query['team'] );
		}
		if ( ! empty( $query['position'] ) ) {
			$where[] = '(p.primary_position = %s OR r.position_code = %s)';
			$position = strtoupper( sanitize_text_field( (string) $query['position'] ) );
			array_push( $args, $position, $position );
		}
		if ( ! empty( $query['nationality'] ) ) {
			$where[] = 'p.nationality = %s';
			$args[]  = strtoupper( sanitize_text_field( (string) $query['nationality'] ) );
		}
		if ( ! empty( $query['eligibility'] ) ) {
			$where[] = 'p.eligibility_status = %s';
			$args[]  = sanitize_key( (string) $query['eligibility'] );
		}
		$registrations = $this->database->prefix . 'instascore_team_registrations';
		$teams         = $this->database->prefix . 'instascore_teams';
		$seasons       = $this->database->prefix . 'instascore_seasons';
		$join = " FROM {$this->table} p
			JOIN {$this->database->prefix}instascore_sports s ON s.id = p.sport_id
			LEFT JOIN {$registrations} r ON r.id = (
				SELECT active_registration.id FROM {$registrations} active_registration
				WHERE active_registration.player_id = p.id AND active_registration.status = 'active'
				ORDER BY active_registration.registered_at DESC, active_registration.id DESC LIMIT 1
			)
			LEFT JOIN {$teams} t ON t.id = r.team_id
			LEFT JOIN {$seasons} se ON se.id = r.season_id";
		$condition = ' WHERE ' . implode( ' AND ', $where );
		$count_sql = "SELECT COUNT(*){$join}{$condition}";
		$list_sql  = "SELECT p.*,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug,
			r.uuid registration_uuid,r.jersey_number,r.position_code registration_position_code,
			t.uuid team_uuid,t.name team_name,t.logo_url team_logo_url,se.uuid season_uuid,se.name season_name
			{$join}{$condition} ORDER BY p.display_name ASC LIMIT %d OFFSET %d";
		$count     = (int) $this->database->get_var( $args ? $this->database->prepare( $count_sql, $args ) : $count_sql );
		$items     = $this->database->get_results( $this->database->prepare( $list_sql, array_merge( $args, array( $per_page, $offset ) ) ), ARRAY_A );
		return array(
			'items' => is_array( $items ) ? $items : array(),
			'total' => $count,
		);
	}
}
