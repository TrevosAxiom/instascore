<?php
/** Runtime security hooks for authentication and REST requests. @package InstaScore_Platform */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\SecurityService;
use WP_Error;
use WP_REST_Request;

final class SecurityHardening {
	public static function register(): void {
		add_filter( 'authenticate', array( self::class, 'authenticate' ), 5, 3 );
		add_action( 'wp_login_failed', array( self::class, 'login_failed' ) );
		add_action( 'wp_login', array( self::class, 'login_succeeded' ), 10, 2 );
		add_filter( 'rest_pre_dispatch', array( self::class, 'rest_guard' ), 5, 3 );
	}

	public static function authenticate( mixed $user, string $username = '', string $password = '' ): mixed {
		unset( $password );
		return SecurityService::create()->pre_authenticate( $user, $username );
	}

	public static function login_failed( string $username ): void { SecurityService::create()->login_failed( $username ); }
	public static function login_succeeded( string $username, \WP_User $user ): void { SecurityService::create()->login_succeeded( $username, $user ); }

	public static function rest_guard( mixed $result, mixed $server, WP_REST_Request $request ): mixed {
		unset( $server );
		$route = (string) $request->get_route();
		if ( ! str_starts_with( $route, '/instascore/v1/' ) ) return $result;
		$method = strtoupper( (string) $request->get_method() );
		if ( in_array( $method, array( 'GET', 'HEAD', 'OPTIONS' ), true ) ) return $result;
		if ( '' !== (string) $request->get_header( 'x-http-method-override' ) ) {
			SecurityService::create()->record( 'rest_method_override_rejected', 'warning', get_current_user_id() ?: null, '', array( 'route' => $route ) );
			return new WP_Error( 'instascore_method_override_rejected', __( 'HTTP method overrides are not accepted.', 'instascore-platform' ), array( 'status' => 400 ) );
		}
		$length = (int) ( $_SERVER['CONTENT_LENGTH'] ?? 0 );
		if ( $length > 2 * 1024 * 1024 ) {
			SecurityService::create()->record( 'rest_payload_rejected', 'warning', get_current_user_id() ?: null, '', array( 'route' => $route, 'bytes' => $length ) );
			return new WP_Error( 'instascore_payload_too_large', __( 'The request payload is too large.', 'instascore-platform' ), array( 'status' => 413 ) );
		}
		return $result;
	}
}
