<?php
/**
 * Development and production SPA assets.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class Assets {
	private const HANDLE = 'instascore-app';

	public static function maybe_enqueue(): void {
		if ( self::is_mount_request() ) {
			wp_dequeue_style( 'irunmole-app' );
			wp_dequeue_script( 'irunmole-app' );
			self::enqueue();
		}
	}

	public static function enqueue(): void {
		if ( wp_script_is( self::HANDLE, 'enqueued' ) ) {
			return;
		}

		if ( Config::is_development() ) {
			wp_enqueue_script_module(
				'instascore-vite-client',
				Config::vite_server() . '/@vite/client',
				array(),
				null
			);
			wp_enqueue_script_module(
				self::HANDLE,
				Config::vite_server() . '/src/main.tsx',
				array( 'instascore-vite-client' ),
				null
			);
			return;
		}

		$manifest_path = INSTASCORE_PLATFORM_PATH . 'dist/.vite/manifest.json';
		if ( ! is_readable( $manifest_path ) ) {
			return;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Reads a local build manifest.
		$manifest = json_decode( (string) file_get_contents( $manifest_path ), true );
		$entry    = is_array( $manifest ) ? ( $manifest['src/main.tsx'] ?? null ) : null;

		if ( ! is_array( $entry ) || empty( $entry['file'] ) ) {
			return;
		}

		foreach ( $entry['css'] ?? array() as $index => $css_file ) {
			wp_enqueue_style(
				self::HANDLE . '-' . (int) $index,
				INSTASCORE_PLATFORM_URL . 'dist/' . ltrim( $css_file, '/' ),
				array(),
				INSTASCORE_PLATFORM_VERSION
			);
		}

		wp_enqueue_script_module(
			self::HANDLE,
			INSTASCORE_PLATFORM_URL . 'dist/' . ltrim( $entry['file'], '/' ),
			array(),
			INSTASCORE_PLATFORM_VERSION
		);
	}

	public static function print_theme_bootstrap(): void {
		if ( ! self::is_mount_request() ) {
			return;
		}

		$script = <<<'JS'
try {
  var preference = localStorage.getItem('instascore-theme') || 'light';
  var dark = preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.instascoreTheme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
} catch (error) {
  document.documentElement.dataset.instascoreTheme = 'dark';
}
JS;

		echo wp_get_inline_script_tag( $script ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	private static function is_mount_request(): bool {
		if ( Shortcode::is_spa_request() ) {
			return true;
		}

		if ( ! is_singular() ) {
			return false;
		}

		$post = get_post();
		return null !== $post && has_shortcode( $post->post_content, Shortcode::TAG );
	}
}
