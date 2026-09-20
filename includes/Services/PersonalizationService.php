<?php
/** Personalized fixtures, newsroom and discovery feed. @package InstaScore_Platform */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Repositories\FavouriteRepository;
use WP_Query;
use wpdb;

final class PersonalizationService {
	public function __construct( private readonly FavouriteRepository $repository ) {}
	public static function create(): self { global $wpdb; return new self( new FavouriteRepository( $wpdb ) ); }

	/** @return array<string,mixed> */
	public function feed( int $user_id ): array {
		$favourites = $this->repository->list_for_user( $user_id );
		$preferences = $this->repository->preferences( $user_id );
		$fixtures = $this->repository->fixture_feed( $favourites );
		$news = $this->news( (array) $preferences['preferredSports'] );
		$items = array_merge( $fixtures, $news );
		$suggestions = $this->repository->suggestions( $favourites );
		if ( array() === $suggestions && array() === $favourites ) $suggestions = array( array( 'type' => 'team', 'label' => 'Follow a team to unlock personalised fixtures.', 'url' => '/favourites', 'reason' => 'Build your feed' ) );
		return array( 'favourites' => $favourites, 'items' => array_slice( $items, 0, 30 ), 'suggestions' => $suggestions );
	}

	/** @param string[] $sports @return array<int,array<string,mixed>> */
	private function news( array $sports ): array {
		$slugs = array_values( array_filter( array_map( 'sanitize_title', $sports ) ) );
		$query = new WP_Query( array( 'post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => 8, 'tax_query' => array( array( 'taxonomy' => 'category', 'field' => 'slug', 'terms' => $slugs, 'operator' => 'IN' ) ), 'ignore_sticky_posts' => true ) );
		return array_map( static function( \WP_Post $post ): array { $categories = get_the_category( $post->ID ); return array( 'type' => 'news', 'id' => $post->ID, 'title' => html_entity_decode( get_the_title( $post ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ), 'excerpt' => wp_strip_all_tags( get_the_excerpt( $post ) ), 'imageUrl' => get_the_post_thumbnail_url( $post->ID, 'medium') ?: null, 'publishedAt' => get_post_time( DATE_ATOM, true, $post ), 'sportSlug' => $categories[0]->slug ?? '', 'url' => '/news/articles/' . $post->ID ); }, $query->posts );
	}
}
