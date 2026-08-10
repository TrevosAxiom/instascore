<?php
/**
 * React SPA shortcode mount.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class Shortcode {
	public const TAG = 'instascore_app';

	public static function register(): void {
		add_shortcode( self::TAG, array( self::class, 'render' ) );
	}

	public static function use_standalone_template( string $template ): string {
		if ( self::is_spa_request() ) {
			return INSTASCORE_PLATFORM_PATH . 'templates/app.php';
		}

		return $template;
	}

	public static function hide_admin_bar_for_app(): void {
		if ( self::is_spa_request() ) {
			show_admin_bar( false );
		}
	}

	/**
	 * Let React handle valid client routes even when WordPress has no matching page.
	 */
	public static function handle_spa_404( bool $handled, \WP_Query $query ): bool {
		if ( ! self::is_spa_request() ) {
			return $handled;
		}

		// Unknown nested paths can otherwise retain attachment/singular flags, causing
		// WordPress head helpers to dereference a post that does not exist.
		$query->init_query_flags();
		$query->set( 'attachment', '' );
		$query->set( 'attachment_id', 0 );
		status_header( 200 );
		return true;
	}

	/**
	 * Avoid redirecting nested SPA URLs to a WordPress guess.
	 */
	public static function prevent_spa_canonical_redirect( string|false $redirect_url, string $requested_url ): string|false {
		unset( $requested_url );
		return self::is_spa_request() ? false : $redirect_url;
	}

	public static function render(): string {
		Assets::enqueue();

		if ( self::is_spa_request() ) {
			$request_path = (string) wp_parse_url( (string) ( $_SERVER['REQUEST_URI'] ?? '/' ), PHP_URL_PATH );
			$current_url  = home_url( $request_path );
		} else {
			$current_url = get_permalink();
		}

		$path = wp_parse_url( $current_url, PHP_URL_PATH );
		$base = is_string( $path ) ? untrailingslashit( $path ) : '';

		$settings = array(
			'apiBase'          => esc_url_raw( rest_url( 'instascore/v1' ) ),
			'appBase'          => self::is_spa_request() ? '' : ( '/' === $base ? '' : $base ),
			'loginUrl'         => esc_url_raw( wp_login_url( $current_url ) ),
			'nonce'            => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : null,
			'manifestUrl'      => esc_url_raw( Pwa::manifest_url() ),
			'serviceWorkerUrl' => esc_url_raw( Pwa::service_worker_url() ),
			'offlineUrl'       => esc_url_raw( Pwa::offline_url() ),
			'oneSignal'        => array(
				'appId'             => Config::onesignal_app_id(),
				'enabled'           => ! Config::notifications_disabled() && '' !== Config::onesignal_app_id(),
				'sdkUrl'            => 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
				'serviceWorkerPath' => Pwa::onesignal_worker_path(),
				'serviceWorkerUrl'  => esc_url_raw( Pwa::onesignal_worker_url() ),
			),
		);

		return sprintf(
			'<script id="instascore-bootstrap" type="application/json">%1$s</script><div id="instascore-root" data-instascore-app></div>',
			(string) wp_json_encode(
				$settings,
				JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
			)
		);
	}

	public static function is_spa_request(): bool {
		$path = trim( (string) wp_parse_url( (string) ( $_SERVER['REQUEST_URI'] ?? '/' ), PHP_URL_PATH ), '/' );
		if ( '' === $path || 'instascore-home' === $path ) {
			return true;
		}

		$roots = array(
			'scores', 'competitions', 'fixtures', 'results', 'standings', 'basketball',
			'favourites', 'search', 'teams', 'players', 'fantasy', 'news', 'more',
			'embed', 'portal', 'notifications', 'login', 'admin', 'operations',
		);
		$root = strtok( $path, '/' );
		return is_string( $root ) && in_array( $root, $roots, true );
	}
}
