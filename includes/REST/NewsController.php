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
		register_rest_route(
			'instascore/v1',
			'/news/archive',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'archive' ),
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
		$items    = array_map( array( $this, 'serialize_post' ), $query->posts );

		$response = Envelope::success( $items );
		$response->header( 'Cache-Control', 'public, max-age=60, must-revalidate' );
		return $response;
	}

	public function archive( WP_REST_Request $request ): WP_REST_Response {
		$category = sanitize_title( (string) $request->get_param( 'category' ) );
		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );
		$per_page = min( 24, max( 6, (int) ( $request->get_param( 'per_page' ) ?: 12 ) ) );
		$query    = new WP_Query(
			array(
				'post_type'           => 'post',
				'post_status'         => 'publish',
				'posts_per_page'      => $per_page,
				'paged'               => $page,
				'category_name'       => $category,
				'ignore_sticky_posts' => true,
			)
		);

		$response = Envelope::success(
			array_map( array( $this, 'serialize_post' ), $query->posts ),
			array(
				'page'       => $page,
				'perPage'    => $per_page,
				'total'      => (int) $query->found_posts,
				'totalPages' => (int) $query->max_num_pages,
			)
		);
		$response->header( 'Cache-Control', 'public, max-age=60, must-revalidate' );
		return $response;
	}

	/** @return array<string,mixed> */
	public function serialize_post( \WP_Post $post ): array {
		$categories = get_the_category( $post->ID );
		$image      = get_the_post_thumbnail_url( $post->ID, 'large' );
		if ( ! $image ) {
			$image = get_post_meta( $post->ID, '_instascore_rss_image_url', true );
		}
		return array(
			'id'          => (int) $post->ID,
			'title'       => get_the_title( $post ),
			'excerpt'     => wp_strip_all_tags( get_the_excerpt( $post ) ),
			'url'         => get_permalink( $post ),
			'imageUrl'    => is_string( $image ) ? $image : null,
			'publishedAt' => get_post_time( DATE_ATOM, true, $post ),
			'categories'  => array_map(
				static fn( \WP_Term $term ): array => array( 'name' => $term->name, 'slug' => $term->slug ),
				$categories
			),
		);
	}
}
