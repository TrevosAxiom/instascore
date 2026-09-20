<?php
/** Atomic provider polling lock backed by the WordPress options table. @package InstaScore_Platform */

namespace InstaScore\Platform\Support;

final class ProviderPollLock {
	private const PREFIX = 'instascore_provider_poll_lock_';

	public static function acquire( string $sport, string $operation, int $ttl = 120 ): ?string {
		$key = self::key( $sport, $operation );
		$now = time();
		$current = get_option( $key, array() );
		if ( is_array( $current ) && (int) ( $current['expiresAt'] ?? 0 ) <= $now ) delete_option( $key );
		$token = wp_generate_uuid4();
		$value = array( 'token' => $token, 'acquiredAt' => $now, 'expiresAt' => $now + max( 15, min( 900, $ttl ) ) );
		return add_option( $key, $value, '', false ) ? $token : null;
	}

	public static function release( string $sport, string $operation, string $token ): void {
		$key = self::key( $sport, $operation );
		$current = get_option( $key, array() );
		if ( is_array( $current ) && hash_equals( (string) ( $current['token'] ?? '' ), $token ) ) delete_option( $key );
	}

	/** @return array<string,string>|null */
	public static function status( string $sport, string $operation ): ?array {
		$value = get_option( self::key( $sport, $operation ), null );
		if ( ! is_array( $value ) || (int) ( $value['expiresAt'] ?? 0 ) <= time() ) return null;
		return array( 'acquiredAt' => gmdate( DATE_ATOM, (int) $value['acquiredAt'] ), 'expiresAt' => gmdate( DATE_ATOM, (int) $value['expiresAt'] ) );
	}

	private static function key( string $sport, string $operation ): string {
		return self::PREFIX . sanitize_key( $sport ) . '_' . sanitize_key( $operation );
	}
}
