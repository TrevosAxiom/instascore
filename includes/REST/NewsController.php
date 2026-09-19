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
		register_rest_route(
			'instascore/v1',
			'/news/(?P<post_id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'show' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function show( WP_REST_Request $request ): WP_REST_Response {
		$post = get_post( (int) $request['post_id'] );
		if ( ! $post instanceof \WP_Post || 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
			return Envelope::error( 'news_not_found', __( 'News story could not be found.', 'instascore-platform' ), array(), 404 );
		}
		$item = $this->serialize_post( $post );
		$item['content'] = wp_kses_post( apply_filters( 'the_content', $post->post_content ) );
		$item['sourceUrl'] = esc_url_raw( (string) get_post_meta( $post->ID, '_instascore_rss_original_url', true ) );
		return Envelope::success( $item );
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
			'title'       => $this->decode_text( get_the_title( $post ) ),
			'excerpt'     => $this->decode_text( wp_strip_all_tags( get_the_excerpt( $post ) ) ),
			'url'         => home_url( '/news/articles/' . (int) $post->ID ),
			'imageUrl'    => is_string( $image ) ? $image : null,
			'publishedAt' => get_post_time( DATE_ATOM, true, $post ),
			'categories'  => array_map(
				static fn( \WP_Term $term ): array => array( 'name' => $term->name, 'slug' => $term->slug ),
				$categories
			),
		);
	}

	private function decode_text( string $text ): string {
		// Some publishers double-encode apostrophes and punctuation in their feeds.
		// Decode twice so `&amp;#039;` and `&#039;` both become readable text.
		return html_entity_decode( html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	}
}
