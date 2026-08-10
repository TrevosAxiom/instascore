<?php
/**
 * Maps provider fixture states to InstaScore statuses.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Providers;

final class ProviderStatusMapper {
	public static function fixture_status( string $provider_status ): string {
		return match ( strtoupper( $provider_status ) ) {
			'TBD', 'NS', 'SCHEDULED' => 'scheduled',
			'1H', '2H', 'ET', 'P', 'LIVE', 'IN_PLAY' => 'live',
			'HT' => 'halftime',
			'FT', 'AET', 'PEN', 'FINISHED' => 'completed',
			'CANC', 'CANCELLED' => 'cancelled',
			'PST', 'POSTPONED' => 'postponed',
			'SUSP', 'SUSPENDED' => 'suspended',
			'ABD', 'ABANDONED' => 'abandoned',
			default => 'draft',
		};
	}
}
