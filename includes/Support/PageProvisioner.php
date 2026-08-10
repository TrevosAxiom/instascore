<?php
/**
 * Creates local WordPress pages for the React SPA mount.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class PageProvisioner {
	/**
	 * Top-level SPA pages that should contain the app shortcode.
	 *
	 * @return array<int,array{title:string,slug:string,parent?:string}>
	 */
	public static function pages(): array {
		return array(
			array(
				'title' => 'InstaScore',
				'slug'  => 'instascore-home',
			),
			array(
				'title' => 'Scores',
				'slug'  => 'scores',
			),
			array(
				'title' => 'Competitions',
				'slug'  => 'competitions',
			),
			array(
				'title' => 'Fixtures',
				'slug'  => 'fixtures',
			),
			array(
				'title' => 'Results',
				'slug'  => 'results',
			),
			array(
				'title' => 'Standings',
				'slug'  => 'standings',
			),
			array(
				'title' => 'Basketball',
				'slug'  => 'basketball',
			),
			array(
				'title' => 'Favourites',
				'slug'  => 'favourites',
			),
			array(
				'title' => 'Search',
				'slug'  => 'search',
			),
			array(
				'title' => 'Teams',
				'slug'  => 'teams',
			),
			array(
				'title' => 'Players',
				'slug'  => 'players',
			),
			array(
				'title' => 'Fantasy',
				'slug'  => 'fantasy',
			),
			array(
				'title'  => 'Fantasy Points',
				'slug'   => 'points',
				'parent' => 'fantasy',
			),
			array(
				'title'  => 'Fantasy Transfers',
				'slug'   => 'transfers',
				'parent' => 'fantasy',
			),
			array(
				'title' => 'News',
				'slug'  => 'news',
			),
			array(
				'title' => 'More',
				'slug'  => 'more',
			),
			array(
				'title' => 'Embed',
				'slug'  => 'embed',
			),
			array(
				'title'  => 'Live Embed',
				'slug'   => 'live',
				'parent' => 'embed',
			),
			array(
				'title'  => 'Fixture Embed',
				'slug'   => 'fixture',
				'parent' => 'embed',
			),
			array(
				'title'  => 'Table Embed',
				'slug'   => 'table',
				'parent' => 'embed',
			),
			array(
				'title' => 'Competition Portal',
				'slug'  => 'portal',
			),
			array(
				'title' => 'Notifications',
				'slug'  => 'notifications',
			),
			array(
				'title' => 'Login',
				'slug'  => 'login',
			),
			array(
				'title' => 'Admin',
				'slug'  => 'admin',
			),
			array(
				'title'  => 'Competition Administration',
				'slug'   => 'competitions',
				'parent' => 'admin',
			),
			array(
				'title'  => 'Teams Administration',
				'slug'   => 'teams',
				'parent' => 'admin',
			),
			array(
				'title'  => 'Fixtures Administration',
				'slug'   => 'fixtures',
				'parent' => 'admin',
			),
			array(
				'title'  => 'Fantasy Administration',
				'slug'   => 'fantasy',
				'parent' => 'admin',
			),
			array(
				'title'  => 'Discipline Administration',
				'slug'   => 'discipline',
				'parent' => 'admin',
			),
			array(
				'title'  => 'Notification Administration',
				'slug'   => 'notifications',
				'parent' => 'admin',
			),
			array(
				'title'  => 'Provider Administration',
				'slug'   => 'providers',
				'parent' => 'admin',
			),
			array(
				'title'  => 'Settings',
				'slug'   => 'settings',
				'parent' => 'admin',
			),
			array(
				'title' => 'Operations',
				'slug'  => 'operations',
			),
			array(
				'title'  => 'Fixture Operations',
				'slug'   => 'fixtures',
				'parent' => 'operations',
			),
		);
	}

	public static function maybe_create_pages(): void {
		if ( INSTASCORE_PLATFORM_VERSION === get_option( 'instascore_pages_provisioned_version', '' ) ) {
			return;
		}

		$created = array();
		foreach ( self::pages() as $page ) {
			$parent_id = 0;
			if ( isset( $page['parent'] ) ) {
				$parent = get_page_by_path( $page['parent'], OBJECT, 'page' );
				if ( null !== $parent ) {
					$parent_id = (int) $parent->ID;
				}
			}

			$path     = 0 === $parent_id ? $page['slug'] : $page['parent'] . '/' . $page['slug'];
			$existing = get_page_by_path( $path, OBJECT, 'page' );
			if ( null === $existing ) {
				$page_id = wp_insert_post(
					array(
						'post_title'   => $page['title'],
						'post_name'    => $page['slug'],
						'post_status'  => 'publish',
						'post_type'    => 'page',
						'post_parent'  => $parent_id,
						'post_content' => '[' . Shortcode::TAG . ']',
					),
					true
				);
				if ( ! is_wp_error( $page_id ) ) {
					$created[] = (int) $page_id;
				}
				continue;
			}

			if ( ! has_shortcode( (string) $existing->post_content, Shortcode::TAG ) ) {
				wp_update_post(
					array(
						'ID'           => (int) $existing->ID,
						'post_content' => trim( (string) $existing->post_content ) . "\n\n[" . Shortcode::TAG . ']',
					)
				);
			}
			$created[] = (int) $existing->ID;
		}

		self::set_front_page();
		update_option( 'instascore_pages_provisioned', '1', false );
		update_option( 'instascore_pages_provisioned_version', INSTASCORE_PLATFORM_VERSION, false );
		update_option( 'instascore_page_ids', array_values( array_unique( $created ) ), false );
		flush_rewrite_rules( false );
	}

	private static function set_front_page(): void {
		$front = get_page_by_path( 'instascore-home', OBJECT, 'page' );
		if ( null === $front ) {
			return;
		}

		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', (int) $front->ID );
	}
}
