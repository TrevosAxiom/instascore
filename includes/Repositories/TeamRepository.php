<?php
/**
 * Team reads.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class TeamRepository extends BaseRepository {
	public function find_by_id( int $id ): ?array {
		$sql = $this->database->prepare( "SELECT * FROM {$this->table} WHERE id = %d LIMIT 1", $id );
		$row = $this->database->get_row( $sql, ARRAY_A );
		return is_array( $row ) ? $row : null;
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
