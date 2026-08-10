<?php
/**
 * Public news API backed by WordPress posts.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use WP_Query;
use WP_REST_Request;
use WP_REST_Response;

final class NewsController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/news',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'index' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function index( WP_REST_Request $request ): WP_REST_Response {
		$category = sanitize_title( (string) $request->get_param( 'category' ) );
		$query    = new WP_Query(
			array(
				'post_type'           => 'post',
				'post_status'         => 'publish',
				'posts_per_page'      => min( 12, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 8 ) ) ),
				'category_name'       => $category,
				'ignore_sticky_posts' => true,
			)
		);
		$items    = array_map(
			static function ( \WP_Post $post ): array {
				$categories = get_the_category( $post->ID );
				$image      = get_the_post_thumbnail_url( $post->ID, 'large' );
				if ( ! $image ) {
					$image = get_post_meta( $post->ID, '_instascore_rss_image_url', true );
				}
				return array(
					'id'         => (int) $post->ID,
					'title'      => get_the_title( $post ),
					'excerpt'    => wp_strip_all_tags( get_the_excerpt( $post ) ),
					'url'        => get_permalink( $post ),
					'imageUrl'   => is_string( $image ) ? $image : null,
					'publishedAt' => get_post_time( DATE_ATOM, true, $post ),
					'categories' => array_map(
						static fn( \WP_Term $term ): array => array( 'name' => $term->name, 'slug' => $term->slug ),
						$categories
					),
				);
			},
			$query->posts
		);

		$response = Envelope::success( $items );
		$response->header( 'Cache-Control', 'public, max-age=60, must-revalidate' );
		return $response;
	}
}
