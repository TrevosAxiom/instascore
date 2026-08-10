<?php
/**
 * Batched RSS-to-news importer.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

final class RssImportService {
	public const SOURCES_OPTION = 'instascore_rss_sources';
	public const SETTINGS_OPTION = 'instascore_rss_settings';

	/** @return array<int,array<string,mixed>> */
	public static function sources(): array {
		$value = get_option( self::SOURCES_OPTION, array() );
		return is_array( $value ) ? array_values( $value ) : array();
	}

	/** @return array<string,mixed> */
	public static function settings(): array {
		$value = get_option( self::SETTINGS_OPTION, array() );
		$value = is_array( $value ) ? $value : array();
		return array(
			'interval'  => in_array( $value['interval'] ?? '', array( 'every_15_minutes', 'hourly', 'twicedaily', 'daily' ), true ) ? $value['interval'] : 'hourly',
			'batchSize' => max( 1, min( 50, (int) ( $value['batchSize'] ?? 10 ) ) ),
			'postStatus' => in_array( $value['postStatus'] ?? '', array( 'publish', 'draft' ), true ) ? $value['postStatus'] : 'publish',
		);
	}

	/** @param array<string,mixed> $input */
	public static function save_settings( array $input ): array {
		$settings = self::settings();
		foreach ( array( 'interval', 'batchSize', 'postStatus' ) as $key ) {
			if ( array_key_exists( $key, $input ) ) {
				$settings[ $key ] = $input[ $key ];
			}
		}
		update_option( self::SETTINGS_OPTION, self::sanitize_settings( $settings ), false );
		return self::settings();
	}

	/** @param array<string,mixed> $input */
	public static function save_source( array $input, string $id = '' ): array {
		$sources = self::sources();
		$source = array(
			'id'          => $id ?: wp_generate_uuid4(),
			'site'        => sanitize_text_field( (string) ( $input['site'] ?? '' ) ),
			'url'         => esc_url_raw( (string) ( $input['url'] ?? '' ) ),
			'category'    => sanitize_title( (string) ( $input['category'] ?? '' ) ),
			'status'      => 'inactive' === ( $input['status'] ?? '' ) ? 'inactive' : 'active',
			'lastRunAt'   => $input['lastRunAt'] ?? null,
			'lastSuccessAt' => $input['lastSuccessAt'] ?? null,
			'lastError'   => sanitize_text_field( (string) ( $input['lastError'] ?? '' ) ),
			'importedTotal' => max( 0, (int) ( $input['importedTotal'] ?? 0 ) ),
		);
		foreach ( $sources as $index => $existing ) {
			if ( (string) ( $existing['id'] ?? '' ) === $source['id'] ) {
				$source = array_merge( $existing, $source );
				$sources[ $index ] = $source;
				update_option( self::SOURCES_OPTION, array_values( $sources ), false );
				return $source;
			}
		}
		$sources[] = $source;
		update_option( self::SOURCES_OPTION, $sources, false );
		return $source;
	}

	public static function delete_source( string $id ): bool {
		$before = self::sources();
		$after = array_values( array_filter( $before, static fn( array $source ): bool => (string) ( $source['id'] ?? '' ) !== $id ) );
		update_option( self::SOURCES_OPTION, $after, false );
		return count( $before ) !== count( $after );
	}

	/** @return array<string,mixed> */
	public static function run( string $only_id = '' ): array {
		$summary = array( 'sources' => 0, 'imported' => 0, 'duplicates' => 0, 'failed' => 0, 'results' => array() );
		foreach ( self::sources() as $source ) {
			if ( ( $only_id && $source['id'] !== $only_id ) || 'active' !== $source['status'] ) {
				continue;
			}
			$result = self::import_source( $source );
			++$summary['sources'];
			$summary['imported'] += $result['imported'];
			$summary['duplicates'] += $result['duplicates'];
			$summary['failed'] += $result['error'] ? 1 : 0;
			$summary['results'][] = $result;
		}
		update_option( 'instascore_rss_last_run', array_merge( $summary, array( 'completedAt' => gmdate( DATE_ATOM ) ) ), false );
		return $summary;
	}

	/** @param array<string,mixed> $source @return array<string,mixed> */
	private static function import_source( array $source ): array {
		$result = array( 'sourceId' => $source['id'], 'site' => $source['site'], 'imported' => 0, 'duplicates' => 0, 'error' => '' );
		if ( ! wp_http_validate_url( $source['url'] ) ) {
			$result['error'] = 'The RSS URL is not a valid public HTTP(S) URL.';
			self::record_result( $source, $result );
			return $result;
		}
		require_once ABSPATH . WPINC . '/feed.php';
		$feed = fetch_feed( $source['url'] );
		if ( is_wp_error( $feed ) ) {
			$result['error'] = sanitize_text_field( $feed->get_error_message() );
			self::record_result( $source, $result );
			return $result;
		}
		$settings = self::settings();
		$items = $feed->get_items( 0, $settings['batchSize'] );
		$term = term_exists( $source['category'], 'category' );
		if ( ! $term ) {
			$term = wp_insert_term( ucwords( str_replace( '-', ' ', $source['category'] ) ), 'category', array( 'slug' => $source['category'] ) );
		}
		$category_id = is_array( $term ) ? (int) $term['term_id'] : (int) $term;
		foreach ( $items as $item ) {
			$link = esc_url_raw( (string) $item->get_permalink() );
			$guid = (string) ( $item->get_id() ?: $link );
			$hash = hash( 'sha256', $source['id'] . '|' . $guid );
			$existing = get_posts( array( 'post_type' => 'post', 'post_status' => 'any', 'meta_key' => '_instascore_rss_hash', 'meta_value' => $hash, 'fields' => 'ids', 'posts_per_page' => 1 ) );
			if ( $existing ) {
				++$result['duplicates'];
				continue;
			}
			$content = wp_kses_post( (string) $item->get_content() );
			$post_id = wp_insert_post( array(
				'post_type' => 'post', 'post_status' => $settings['postStatus'],
				'post_title' => sanitize_text_field( (string) $item->get_title() ),
				'post_content' => $content,
				'post_excerpt' => wp_trim_words( wp_strip_all_tags( $item->get_description() ), 45 ),
				'post_date_gmt' => $item->get_date( 'Y-m-d H:i:s' ) ?: current_time( 'mysql', true ),
				'post_category' => $category_id ? array( $category_id ) : array(),
			), true );
			if ( is_wp_error( $post_id ) ) {
				$result['error'] = sanitize_text_field( $post_id->get_error_message() );
				continue;
			}
			update_post_meta( $post_id, '_instascore_rss_hash', $hash );
			update_post_meta( $post_id, '_instascore_rss_source_id', $source['id'] );
			update_post_meta( $post_id, '_instascore_rss_source_site', $source['site'] );
			update_post_meta( $post_id, '_instascore_rss_original_url', $link );
			$image = self::image_url( $item, $content );
			if ( $image ) update_post_meta( $post_id, '_instascore_rss_image_url', $image );
			++$result['imported'];
		}
		self::record_result( $source, $result );
		return $result;
	}

	private static function image_url( object $item, string $content ): string {
		$enclosure = $item->get_enclosure();
		if ( $enclosure && str_starts_with( (string) $enclosure->get_type(), 'image/' ) ) return esc_url_raw( (string) $enclosure->get_link() );
		if ( preg_match( '/<img[^>]+src=["\']([^"\']+)["\']/i', $content, $match ) ) return esc_url_raw( $match[1] );
		return '';
	}

	/** @param array<string,mixed> $source @param array<string,mixed> $result */
	private static function record_result( array $source, array $result ): void {
		$source['lastRunAt'] = gmdate( DATE_ATOM );
		$source['lastError'] = $result['error'];
		if ( ! $result['error'] ) $source['lastSuccessAt'] = $source['lastRunAt'];
		$source['importedTotal'] = (int) ( $source['importedTotal'] ?? 0 ) + (int) $result['imported'];
		self::save_source( $source, $source['id'] );
	}

	/** @param array<string,mixed> $settings */
	private static function sanitize_settings( array $settings ): array {
		return array(
			'interval' => in_array( $settings['interval'] ?? '', array( 'every_15_minutes', 'hourly', 'twicedaily', 'daily' ), true ) ? $settings['interval'] : 'hourly',
			'batchSize' => max( 1, min( 50, (int) ( $settings['batchSize'] ?? 10 ) ) ),
			'postStatus' => 'draft' === ( $settings['postStatus'] ?? '' ) ? 'draft' : 'publish',
		);
	}
}
