<?php
/**
 * Maps provider fixture states to InstaScore statuses.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Providers;

final class ProviderStatusMapper {
	private const MAP = array(
		'TBD'         => 'scheduled',
		'NS'          => 'scheduled',
		'SCHEDULED'   => 'scheduled',
		'NOT_STARTED' => 'scheduled',
		'1H'          => 'live',
		'2H'          => 'live',
		'ET'          => 'live',
		'P'           => 'live',
		'Q1'          => 'live',
		'Q2'          => 'live',
		'Q3'          => 'live',
		'Q4'          => 'live',
		'1Q'          => 'live',
		'2Q'          => 'live',
		'3Q'          => 'live',
		'4Q'          => 'live',
		'OT'          => 'live',
		'LIVE'        => 'live',
		'IN_PLAY'     => 'live',
		'HT'          => 'halftime',
		'HALFTIME'    => 'halftime',
		'BT'          => 'interval',
		'BREAK'       => 'interval',
		'FT'          => 'completed',
		'AET'         => 'completed',
		'AOT'         => 'completed',
		'PEN'         => 'completed',
		'FINISHED'    => 'completed',
		'FINAL'       => 'completed',
		'AWD'         => 'completed',
		'WO'          => 'completed',
		'CANC'        => 'cancelled',
		'CANCELLED'   => 'cancelled',
		'PST'         => 'postponed',
		'POST'        => 'postponed',
		'POSTPONED'   => 'postponed',
		'SUSP'        => 'suspended',
		'SUSPENDED'   => 'suspended',
		'INT'         => 'suspended',
		'INTERRUPTED' => 'suspended',
		'ABD'         => 'abandoned',
		'ABANDONED'   => 'abandoned',
	);

	public static function fixture_status( string $provider_status ): string {
		return self::MAP[ self::code( $provider_status ) ] ?? 'draft';
	}

	public static function is_known( string $provider_status ): bool {
		return isset( self::MAP[ self::code( $provider_status ) ] );
	}

	private static function code( string $provider_status ): string {
		return strtoupper( trim( $provider_status ) );
	}
}
