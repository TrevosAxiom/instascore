<?php
/**
 * PWA asset bridge for root-scoped service worker support.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class Pwa {
	public const SERVICE_WORKER_PATH = 'instascore-sw.js';
	public const MANIFEST_PATH       = 'instascore.webmanifest';
	public const OFFLINE_PATH        = 'instascore-offline.html';
	public const ONESIGNAL_WORKER    = 'OneSignalSDKWorker.js';
	public const ONESIGNAL_SAFE_PATH = 'push/onesignal/OneSignalSDKWorker.js';

	public static function maybe_serve_asset(): void {
		$request_path = trim( (string) wp_parse_url( (string) ( $_SERVER['REQUEST_URI'] ?? '' ), PHP_URL_PATH ), '/' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$targets      = array(
			self::SERVICE_WORKER_PATH => array( 'dist/sw.js', 'application/javascript; charset=utf-8' ),
			self::MANIFEST_PATH       => array( 'dist/manifest.webmanifest', 'application/manifest+json; charset=utf-8' ),
			self::OFFLINE_PATH        => array( 'dist/offline.html', 'text/html; charset=utf-8' ),
			'offline.html'             => array( 'dist/offline.html', 'text/html; charset=utf-8' ),
			self::ONESIGNAL_WORKER    => array( 'dist/OneSignalSDKWorker.js', 'application/javascript; charset=utf-8' ),
			self::ONESIGNAL_SAFE_PATH => array( 'dist/push/onesignal/OneSignalSDKWorker.js', 'application/javascript; charset=utf-8' ),
		);

		if ( ! isset( $targets[ $request_path ] ) ) {
			return;
		}

		$file = INSTASCORE_PLATFORM_PATH . $targets[ $request_path ][0];
		if ( ! is_readable( $file ) ) {
			status_header( 404 );
			exit;
		}

		header( 'Content-Type: ' . $targets[ $request_path ][1] );
		header( 'Cache-Control: no-cache, no-store, must-revalidate' );
		header( 'Service-Worker-Allowed: /' );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Serves a local built PWA asset.
		echo file_get_contents( $file ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	public static function print_head_tags(): void {
		printf(
			'<link rel="manifest" href="%1$s"><meta name="theme-color" content="#07192d"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="InstaScore"><meta name="format-detection" content="telephone=no"><link rel="apple-touch-icon" sizes="192x192" href="%2$s">',
			esc_url( self::manifest_url() ),
			esc_url( INSTASCORE_PLATFORM_URL . 'dist/icons/icon-192.png' )
		);
	}

	public static function service_worker_url(): string {
		return home_url( '/' . self::SERVICE_WORKER_PATH );
	}

	public static function manifest_url(): string {
		return home_url( '/' . self::MANIFEST_PATH );
	}

	public static function offline_url(): string {
		return home_url( '/' . self::OFFLINE_PATH );
	}

	public static function onesignal_worker_url(): string {
		return home_url( '/' . self::ONESIGNAL_WORKER );
	}

	public static function onesignal_worker_path(): string {
		return '/' . self::ONESIGNAL_SAFE_PATH;
	}

}
