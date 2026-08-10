<?php
/**
 * InstaScore editorial category provisioning.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class NewsProvisioner {
	/** @var array<string,string> */
	private const CATEGORIES = array(
		'cffl'          => 'CFFL',
		'flag-football' => 'Flag Football',
		'football'      => 'Soccer',
		'basketball'    => 'Basketball',
	);

	public static function maybe_create_categories(): void {
		$provisioning_version = INSTASCORE_PLATFORM_VERSION . '-soccer-label';
		if ( $provisioning_version === get_option( 'instascore_news_categories_version', '' ) ) {
			return;
		}

		foreach ( self::CATEGORIES as $slug => $name ) {
			$term = get_term_by( 'slug', $slug, 'category' );
			if ( ! $term ) {
				wp_insert_term( $name, 'category', array( 'slug' => $slug ) );
			} elseif ( $term->name !== $name ) {
				wp_update_term( $term->term_id, 'category', array( 'name' => $name ) );
			}
		}

		update_option( 'instascore_news_categories_version', $provisioning_version, false );
	}
}
