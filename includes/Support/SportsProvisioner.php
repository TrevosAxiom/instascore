<?php
/**
 * Ensures the platform's supported sport catalog exists.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class SportsProvisioner {
	public static function maybe_seed(): void {
		if ( INSTASCORE_PLATFORM_VERSION === get_option( 'instascore_sports_provisioned_version', '' ) ) return;
		global $wpdb;
		$table = $wpdb->prefix . 'instascore_sports';
		$now = gmdate( 'Y-m-d H:i:s' );
		foreach ( array( 'flag-football' => 'Flag Football', 'football' => 'Soccer', 'basketball' => 'Basketball', 'nfl' => 'NFL' ) as $slug => $name ) {
			$exists = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE slug = %s LIMIT 1", $slug ) );
			if ( $exists ) continue;
			$wpdb->insert( $table, array(
				'uuid' => wp_generate_uuid4(), 'name' => $name, 'slug' => $slug,
				'config_json' => '{}', 'status' => 'active', 'source' => 'internal',
				'created_by' => get_current_user_id(), 'updated_by' => get_current_user_id(),
				'created_at' => $now, 'updated_at' => $now, 'revision' => 1,
			) );
		}
		update_option( 'instascore_sports_provisioned_version', INSTASCORE_PLATFORM_VERSION, false );
	}
}
