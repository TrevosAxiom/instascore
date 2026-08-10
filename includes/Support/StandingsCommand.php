<?php
/**
 * WP-CLI command registration for deterministic standings rebuilds.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\StandingsService;

final class StandingsCommand {
	public static function register(): void {
		if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
			return;
		}
		\WP_CLI::add_command(
			'instascore standings rebuild',
			static function ( array $args, array $assoc_args ): void {
				$competition_id = (int) ( $assoc_args['competition_id'] ?? 0 );
				$season_id      = (int) ( $assoc_args['season_id'] ?? 0 );
				if ( $competition_id <= 0 || $season_id <= 0 ) {
					\WP_CLI::error( 'Provide --competition_id and --season_id.' );
				}
				$result = StandingsService::create()->rebuild_scope( $competition_id, $season_id, null, null, 'cli_rebuild' );
				\WP_CLI::success( 'Rebuilt standings hash ' . $result['rebuildHash'] . ' with ' . $result['rows'] . ' rows.' );
			}
		);
	}
}
