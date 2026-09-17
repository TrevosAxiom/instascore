<?php
/**
 * Small authenticated-encryption wrapper for saved integration secrets.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class SecretVault {
	public static function encrypt( string $plain ): string {
		if ( '' === $plain ) { return ''; }
		$key = hash( 'sha256', wp_salt( 'auth' ), true );
		if ( function_exists( 'sodium_crypto_secretbox' ) ) {
			$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			return 'sodium:' . base64_encode( $nonce . sodium_crypto_secretbox( $plain, $nonce, $key ) );
		}
		$iv = random_bytes( 12 );
		$tag = '';
		$cipher = openssl_encrypt( $plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );
		return false === $cipher ? '' : 'openssl:' . base64_encode( $iv . $tag . $cipher );
	}

	public static function decrypt( string $encoded ): string {
		if ( '' === $encoded || ! str_contains( $encoded, ':' ) ) { return ''; }
		list( $method, $payload ) = explode( ':', $encoded, 2 );
		$binary = base64_decode( $payload, true );
		if ( false === $binary ) { return ''; }
		$key = hash( 'sha256', wp_salt( 'auth' ), true );
		if ( 'sodium' === $method && function_exists( 'sodium_crypto_secretbox_open' ) ) {
			$nonce = substr( $binary, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$plain = sodium_crypto_secretbox_open( substr( $binary, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), $nonce, $key );
			return false === $plain ? '' : $plain;
		}
		if ( 'openssl' === $method ) {
			$plain = openssl_decrypt( substr( $binary, 28 ), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr( $binary, 0, 12 ), substr( $binary, 12, 16 ) );
			return false === $plain ? '' : $plain;
		}
		return '';
	}
}
