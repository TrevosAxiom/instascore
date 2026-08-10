<?php
/**
 * Migration 0014: day-to-day account roles and permissions.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

final class Version0014 implements Migration {
	public function version(): int { return 14; }
	public function name(): string { return 'create_operational_account_roles'; }
	public function checksum(): string { return hash( 'sha256', $this->name() ); }

	public function up(): void {
		foreach ( array( 'administrator', 'instascore_league_administrator' ) as $role_name ) {
			$role = get_role( $role_name );
			if ( null !== $role ) {
				$role->add_cap( 'instascore_manage_users' );
			}
		}
		add_role(
			'instascore_match_official',
			'Match Official',
			array(
				'read' => true,
			)
		);
	}
}
