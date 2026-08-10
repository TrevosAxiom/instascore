<?php
/**
 * Fixture status history.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

final class FixtureStatusHistoryRepository extends BaseRepository {
	public function append( int $fixture_id, ?string $from_status, string $to_status, string $reason = '' ): void {
		$this->create(
			array(
				'uuid'          => wp_generate_uuid4(),
				'fixture_id'    => $fixture_id,
				'from_status'   => $from_status,
				'to_status'     => $to_status,
				'reason'        => $reason,
				'actor_user_id' => get_current_user_id(),
				'created_at'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);
	}
}
