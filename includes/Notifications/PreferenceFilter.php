<?php
/**
 * Notification preference and quiet-hours filtering.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Notifications;

use DateTimeImmutable;
use DateTimeZone;

final class PreferenceFilter {
	/**
	 * @param array<string,mixed> $preference Stored preference row.
	 */
	public function allows( array $preference, DateTimeImmutable $now ): bool {
		if ( array_key_exists( 'enabled', $preference ) && ! (bool) $preference['enabled'] ) {
			return false;
		}

		$start = (string) ( $preference['quiet_hours_start'] ?? '' );
		$end   = (string) ( $preference['quiet_hours_end'] ?? '' );
		if ( '' === $start || '' === $end ) {
			return true;
		}

		try {
			$timezone = new DateTimeZone( (string) ( $preference['timezone'] ?? 'UTC' ) );
		} catch ( \Exception ) {
			$timezone = new DateTimeZone( 'UTC' );
		}
		$local    = $now->setTimezone( $timezone )->format( 'H:i' );

		if ( $start <= $end ) {
			return ! ( $local >= $start && $local < $end );
		}

		return ! ( $local >= $start || $local < $end );
	}
}
