<?php
/**
 * Fixture official assignments.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class FixtureOfficialRepository extends BaseRepository {
	public function replace_for_fixture( int $fixture_id, array $officials ): void {
		$this->database->delete( $this->table, array( 'fixture_id' => $fixture_id ) );
		foreach ( $officials as $official ) {
			$this->create(
				array(
					'uuid'        => wp_generate_uuid4(),
					'fixture_id'  => $fixture_id,
					'official_id' => $official['official_id'],
					'role'        => $official['role'],
					'status'      => 'active',
					'created_by'  => get_current_user_id(),
					'updated_by'  => get_current_user_id(),
					'created_at'  => gmdate( 'Y-m-d H:i:s' ),
					'updated_at'  => gmdate( 'Y-m-d H:i:s' ),
				)
			);
		}
	}
}
