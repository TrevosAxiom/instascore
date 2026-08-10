<?php
/**
 * Environment-backed configuration.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class Config {
	public static function environment(): string {
		return self::value( 'INSTASCORE_ENVIRONMENT', wp_get_environment_type() );
	}

	public static function is_development(): bool {
		return 'development' === self::environment();
	}

	public static function vite_server(): string {
		return untrailingslashit(
			self::value( 'INSTASCORE_VITE_DEV_SERVER', 'http://localhost:5173' )
		);
	}

	public static function onesignal_app_id(): string {
		return self::value( 'INSTASCORE_ONESIGNAL_APP_ID', '' );
	}

	public static function onesignal_rest_api_key(): string {
		return self::value( 'INSTASCORE_ONESIGNAL_REST_API_KEY', '' );
	}

	public static function notifications_disabled(): bool {
		return '1' === self::value( 'INSTASCORE_NOTIFICATIONS_DISABLED', '0' );
	}

	public static function notifications_allow_test_fixtures(): bool {
		return '1' === self::value( 'INSTASCORE_NOTIFICATIONS_ALLOW_TEST_FIXTURES', '0' );
	}

	public static function football_provider_base_url(): string {
		return 'https://v3.football.api-sports.io';
	}

	public static function football_provider_api_key(): string {
		return self::value( 'INSTASCORE_FOOTBALL_API_KEY', (string) get_option( 'instascore_provider_football_api_key', '' ) );
	}

	public static function football_provider_name(): string {
		return 'api_football';
	}

	/** @return array<int,string> */
	public static function football_provider_league_ids(): array {
		return self::league_ids( 'football' );
	}

	public static function basketball_provider_base_url(): string {
		return 'https://v1.basketball.api-sports.io';
	}

	public static function basketball_provider_api_key(): string {
		return self::value( 'INSTASCORE_BASKETBALL_API_KEY', (string) get_option( 'instascore_provider_basketball_api_key', '' ) );
	}

	public static function basketball_provider_name(): string {
		return 'api_basketball';
	}

	/** @return array<int,string> */
	public static function basketball_provider_league_ids(): array {
		return self::league_ids( 'basketball' );
	}

	/** @return array<int,string> */
	private static function league_ids( string $sport ): array {
		$value = get_option( "instascore_provider_{$sport}_league_ids", array() );
		$ids = array_map( static fn( $id ): string => trim( (string) $id ), is_array( $value ) ? $value : explode( ',', (string) $value ) );
		return array_values( array_unique( array_filter( $ids, 'ctype_digit' ) ) );
	}

	private static function value( string $key, string $fallback ): string {
		if ( defined( $key ) ) {
			$value = constant( $key );
			return is_string( $value ) && '' !== $value ? $value : $fallback;
		}

		$value = getenv( $key );
		return false !== $value && '' !== $value ? $value : $fallback;
	}
}
