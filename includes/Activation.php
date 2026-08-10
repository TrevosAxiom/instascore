<?php
/**
 * Plugin activation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform;

use InstaScore\Platform\Database\MigrationRunner;

final class Activation {
	public static function activate(): void {
		MigrationRunner::create()->run();

		$administrator = get_role( 'administrator' );
		if ( null !== $administrator ) {
			$administrator->add_cap( 'instascore_access_admin' );
			$administrator->add_cap( 'instascore_access_operations' );
			$administrator->add_cap( 'instascore_manage_leagues' );
			$administrator->add_cap( 'instascore_manage_competitions' );
			$administrator->add_cap( 'instascore_manage_teams' );
			$administrator->add_cap( 'instascore_manage_players' );
			$administrator->add_cap( 'instascore_manage_venues' );
			$administrator->add_cap( 'instascore_manage_officials' );
			$administrator->add_cap( 'instascore_manage_fixtures' );
			$administrator->add_cap( 'instascore_manage_scoring' );
			$administrator->add_cap( 'instascore_confirm_results' );
			$administrator->add_cap( 'instascore_manage_users' );
		}

		add_role(
			'instascore_league_administrator',
			'League Administrator',
			array(
				'read'                           => true,
				'upload_files'                   => true,
				'instascore_access_admin'        => true,
				'instascore_manage_leagues'      => true,
				'instascore_manage_competitions' => true,
				'instascore_manage_teams'        => true,
				'instascore_manage_players'      => true,
				'instascore_manage_venues'       => true,
				'instascore_manage_officials'    => true,
				'instascore_manage_fixtures'     => true,
				'instascore_manage_scoring'      => true,
				'instascore_confirm_results'     => true,
				'instascore_manage_users'        => true,
			)
		);
		add_role(
			'instascore_competition_manager',
			'Competition Manager',
			array(
				'read'                           => true,
				'upload_files'                   => true,
				'instascore_access_admin'        => true,
				'instascore_manage_competitions' => true,
				'instascore_manage_teams'        => true,
				'instascore_manage_players'      => true,
				'instascore_manage_fixtures'     => true,
				'instascore_manage_scoring'      => true,
				'instascore_confirm_results'     => true,
			)
		);
		add_role(
			'instascore_scorekeeper',
			'Scorekeeper',
			array(
				'read'                         => true,
				'instascore_access_operations' => true,
				'instascore_manage_scoring'    => true,
			)
		);
		add_role(
			'instascore_team_administrator',
			'Team Administrator',
			array(
				'read'                      => true,
				'upload_files'              => true,
				'instascore_access_admin'   => true,
				'instascore_manage_teams'   => true,
				'instascore_manage_players' => true,
			)
		);
		add_role(
			'instascore_match_official',
			'Match Official',
			array( 'read' => true )
		);

		flush_rewrite_rules();
	}
}
