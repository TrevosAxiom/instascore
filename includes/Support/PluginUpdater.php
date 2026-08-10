<?php
/**
 * Release-only GitHub update channel for the InstaScore plugin.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class PluginUpdater {
	private const REPOSITORY    = 'TrevosAxiom/instascore';
	private const API_URL       = 'https://api.github.com/repos/' . self::REPOSITORY . '/releases?per_page=20';
	private const CACHE_KEY     = 'instascore_platform_latest_release';
	private const CACHE_SECONDS = 6 * HOUR_IN_SECONDS;

	public static function register(): void {
		add_filter( 'pre_set_site_transient_update_plugins', array( self::class, 'check_for_update' ) );
		add_filter( 'plugins_api', array( self::class, 'plugin_information' ), 20, 3 );
		add_filter( 'auto_update_plugin', array( self::class, 'enable_auto_update' ), 20, 2 );
	}

	/**
	 * Keep this release-managed plugin opted into WordPress background updates.
	 *
	 * @param bool  $update Existing auto-update decision.
	 * @param mixed $item   Plugin update data.
	 */
	public static function enable_auto_update( bool $update, $item ): bool {
		$plugin = plugin_basename( INSTASCORE_PLATFORM_FILE );
		if ( is_object( $item ) && ( $plugin === ( $item->plugin ?? '' ) || 'instascore-platform' === ( $item->slug ?? '' ) ) ) {
			return true;
		}
		return $update;
	}

	/**
	 * Add a WordPress update only when a newer published GitHub Release exists.
	 * Ordinary commits and tags without a Release are intentionally ignored.
	 *
	 * @param mixed $transient WordPress update transient.
	 * @return mixed
	 */
	public static function check_for_update( $transient ) {
		if ( ! is_object( $transient ) ) {
			return $transient;
		}

		$release = self::latest_release();
		if ( null === $release || version_compare( $release['version'], INSTASCORE_PLATFORM_VERSION, '<=' ) ) {
			return $transient;
		}

		$plugin = plugin_basename( INSTASCORE_PLATFORM_FILE );
		if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) {
			$transient->response = array();
		}
		$transient->response[ $plugin ] = (object) array(
			'id'           => 'github.com/' . self::REPOSITORY,
			'slug'         => 'instascore-platform',
			'plugin'       => $plugin,
			'new_version'  => $release['version'],
			'url'          => $release['htmlUrl'],
			'package'      => $release['packageUrl'],
			'requires'     => '6.6',
			'requires_php' => '8.2',
			'tested'       => '6.8',
		);

		return $transient;
	}

	/**
	 * Supply the release details displayed by WordPress before an update.
	 *
	 * @param mixed  $result Existing result.
	 * @param string $action Plugin API action.
	 * @param mixed  $args   Plugin API arguments.
	 * @return mixed
	 */
	public static function plugin_information( $result, string $action, $args ) {
		if ( 'plugin_information' !== $action || ! is_object( $args ) || 'instascore-platform' !== ( $args->slug ?? '' ) ) {
			return $result;
		}

		$release = self::latest_release();
		if ( null === $release ) {
			return $result;
		}

		return (object) array(
			'name'          => 'InstaScore Platform',
			'slug'          => 'instascore-platform',
			'version'       => $release['version'],
			'author'        => '<a href="https://github.com/TrevosAxiom">InstaScore</a>',
			'homepage'      => $release['htmlUrl'],
			'download_link' => $release['packageUrl'],
			'requires'      => '6.6',
			'requires_php'  => '8.2',
			'tested'        => '6.8',
			'sections'      => array(
				'description' => 'The InstaScore sports platform and match-day application.',
				'changelog'   => nl2br( esc_html( $release['notes'] ) ),
			),
		);
	}

	/**
	 * @return array{version:string,packageUrl:string,htmlUrl:string,notes:string}|null
	 */
	private static function latest_release(): ?array {
		$cached = get_site_transient( self::CACHE_KEY );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$response = wp_remote_get(
			self::API_URL,
			array(
				'timeout' => 10,
				'headers' => array(
					'Accept'     => 'application/vnd.github+json',
					'User-Agent' => 'InstaScore-WordPress-Updater/' . INSTASCORE_PLATFORM_VERSION,
				),
			)
		);
		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}

		$payload = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $payload ) ) {
			return null;
		}

		$release = null;
		foreach ( $payload as $candidate ) {
			$normalized = is_array( $candidate ) ? self::normalize_release( $candidate ) : null;
			if ( null !== $normalized && ( null === $release || version_compare( $normalized['version'], $release['version'], '>' ) ) ) {
				$release = $normalized;
			}
		}
		if ( null === $release ) {
			return null;
		}

		set_site_transient( self::CACHE_KEY, $release, self::CACHE_SECONDS );
		return $release;
	}

	/**
	 * Accept stable releases and explicit release-candidate prereleases only.
	 * Drafts, alpha/beta builds and releases without the packaged plugin ZIP are ignored.
	 *
	 * @param array<string,mixed> $payload GitHub release payload.
	 * @return array{version:string,packageUrl:string,htmlUrl:string,notes:string}|null
	 */
	private static function normalize_release( array $payload ): ?array {
		if ( ! empty( $payload['draft'] ) ) {
			return null;
		}
		$version = ltrim( sanitize_text_field( (string) ( $payload['tag_name'] ?? '' ) ), 'vV' );
		if ( '' === $version || ! preg_match( '/^\d+\.\d+\.\d+(?:-rc(?:[.-]\d+)?)?$/i', $version ) ) {
			return null;
		}
		if ( ! empty( $payload['prerelease'] ) && ! str_contains( strtolower( $version ), '-rc' ) ) {
			return null;
		}

		$package_url = '';
		foreach ( (array) ( $payload['assets'] ?? array() ) as $asset ) {
			$name = (string) ( $asset['name'] ?? '' );
			if ( str_starts_with( $name, 'instascore-platform-' ) && str_ends_with( $name, '.zip' ) ) {
				$package_url = esc_url_raw( (string) ( $asset['browser_download_url'] ?? '' ) );
				break;
			}
		}
		if ( '' === $package_url ) {
			return null;
		}

		return array(
			'version'    => $version,
			'packageUrl' => $package_url,
			'htmlUrl'    => esc_url_raw( (string) ( $payload['html_url'] ?? '' ) ),
			'notes'      => sanitize_textarea_field( (string) ( $payload['body'] ?? '' ) ),
		);
	}
}
