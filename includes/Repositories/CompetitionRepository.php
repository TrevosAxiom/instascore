<?php
/**
 * Competition reads.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Repositories;

final class CompetitionRepository extends BaseRepository {
	/**
	 * @param array<string,mixed> $query Query.
	 * @return array{items:array<int,array<string,mixed>>,total:int}
	 */
	public function public_list( array $query ): array {
		$page     = max( 1, (int) ( $query['page'] ?? 1 ) );
		$per_page = min( 50, max( 1, (int) ( $query['perPage'] ?? 12 ) ) );
		$offset   = ( $page - 1 ) * $per_page;
		$where    = ! empty( $query['includeArchived'] ) ? array( "c.status IN ('active','archived')" ) : array( "c.status = 'active'" );
		$args     = array();

		if ( ! empty( $query['sport'] ) ) {
			$where[] = 's.slug = %s';
			$args[]  = sanitize_title( (string) $query['sport'] );
		}
		if ( ! empty( $query['type'] ) ) {
			$where[] = 'c.competition_type = %s';
			$args[]  = sanitize_key( (string) $query['type'] );
		}
		if ( ! empty( $query['search'] ) ) {
			$where[] = 'c.name LIKE %s';
			$args[]  = '%' . $this->database->esc_like( sanitize_text_field( (string) $query['search'] ) ) . '%';
		}

		$allowed_sort = array(
			'name'    => 'c.name',
			'updated' => 'c.updated_at',
			'created' => 'c.created_at',
		);
		$sort         = $allowed_sort[ $query['sort'] ?? 'name' ] ?? 'c.name';
		$order        = 'desc' === strtolower( (string) ( $query['order'] ?? 'asc' ) ) ? 'DESC' : 'ASC';
		$join         = " FROM {$this->table} c JOIN {$this->database->prefix}instascore_sports s ON s.id = c.sport_id";
		$condition    = ' WHERE ' . implode( ' AND ', $where );
		$count_sql    = "SELECT COUNT(*){$join}{$condition}";
		$list_sql     = "SELECT c.uuid,c.name,c.slug,c.competition_type,c.description,c.country_code,c.rules_json,c.logo_url,c.status,c.updated_at,s.uuid sport_uuid,s.name sport_name,s.slug sport_slug{$join}{$condition} ORDER BY {$sort} {$order}, c.id ASC LIMIT %d OFFSET %d";
		$count        = (int) $this->database->get_var( $args ? $this->database->prepare( $count_sql, $args ) : $count_sql );
		$list_args    = array_merge( $args, array( $per_page, $offset ) );
		$items        = $this->database->get_results( $this->database->prepare( $list_sql, $list_args ), ARRAY_A );
		return array(
			'items' => is_array( $items ) ? $items : array(),
			'total' => $count,
		);
	}
}
