<?php
/**
 * Public user identity helper.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class UserIdentity {
	public static function uuid( int $user_id ): string {
		$uuid = (string) get_user_meta( $user_id, 'instascore_user_uuid', true );

		if ( ! wp_is_uuid( $uuid ) ) {
			$uuid = wp_generate_uuid4();
			update_user_meta( $user_id, 'instascore_user_uuid', $uuid );
		}

		return $uuid;
	}
}
