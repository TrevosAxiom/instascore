<?php
/** Commerce REST API. @package InstaScore_Platform */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\CommerceService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class CommerceController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/commerce/catalogue', array( 'methods' => 'GET', 'callback' => fn(): WP_REST_Response => Envelope::success( CommerceService::create()->catalogue() ), 'permission_callback' => '__return_true' ) );
		register_rest_route( 'instascore/v1', '/commerce/checkout', array( 'methods' => 'POST', 'callback' => fn( WP_REST_Request $r ): WP_REST_Response => $this->execute( fn(): array => CommerceService::create()->checkout( (array) $r->get_json_params(), get_current_user_id() ), 201 ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( 'instascore/v1', '/commerce/orders', array( 'methods' => 'GET', 'callback' => fn(): WP_REST_Response => Envelope::success( CommerceService::create()->orders( get_current_user_id() ) ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( 'instascore/v1', '/commerce/entitlements', array( 'methods' => 'GET', 'callback' => fn(): WP_REST_Response => Envelope::success( CommerceService::create()->entitlements( get_current_user_id() ) ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( 'instascore/v1', '/admin/commerce', array( 'methods' => 'GET', 'callback' => fn(): WP_REST_Response => Envelope::success( array( 'products' => CommerceService::create()->catalogue( true ), 'orders' => CommerceService::create()->orders(), 'report' => CommerceService::create()->report() ) ), 'permission_callback' => array( $this, 'admin' ) ) );
		register_rest_route( 'instascore/v1', '/admin/commerce/products', array( 'methods' => 'POST', 'callback' => fn( WP_REST_Request $r ): WP_REST_Response => $this->execute( fn(): array => CommerceService::create()->save_product( (array) $r->get_json_params() ), 201 ), 'permission_callback' => array( $this, 'admin' ) ) );
		register_rest_route( 'instascore/v1', '/admin/commerce/products/(?P<uuid>[0-9a-f-]{36})', array( 'methods' => 'PATCH', 'callback' => fn( WP_REST_Request $r ): WP_REST_Response => $this->execute( fn(): array => CommerceService::create()->save_product( (array) $r->get_json_params(), (string) $r['uuid'] ) ), 'permission_callback' => array( $this, 'admin' ) ) );
		register_rest_route( 'instascore/v1', '/admin/commerce/orders/(?P<uuid>[0-9a-f-]{36})/settle', array( 'methods' => 'POST', 'callback' => fn( WP_REST_Request $r ): WP_REST_Response => $this->execute( fn(): array => CommerceService::create()->settle( (string) $r['uuid'], (array) $r->get_json_params() ) ), 'permission_callback' => array( $this, 'admin' ) ) );
		register_rest_route( 'instascore/v1', '/admin/commerce/orders/(?P<uuid>[0-9a-f-]{36})/fulfil', array( 'methods' => 'POST', 'callback' => fn( WP_REST_Request $r ): WP_REST_Response => $this->execute( fn(): array => CommerceService::create()->fulfil( (string) $r['uuid'] ) ), 'permission_callback' => array( $this, 'admin' ) ) );
		register_rest_route( 'instascore/v1', '/admin/commerce/tickets/redeem', array( 'methods' => 'POST', 'callback' => fn( WP_REST_Request $r ): WP_REST_Response => $this->execute( fn(): array => CommerceService::create()->redeem_ticket( (string) $r->get_param( 'accessCode' ) ) ), 'permission_callback' => array( $this, 'admin' ) ) );
	}
	public function authenticated(): bool|WP_Error { return is_user_logged_in() ? true : new WP_Error( 'instascore_auth_required', 'Sign in to continue.', array( 'status' => 401 ) ); }
	public function admin(): bool|WP_Error { return current_user_can( 'instascore_access_admin' ) ? true : new WP_Error( 'instascore_forbidden', 'Administrator access is required.', array( 'status' => 403 ) ); }
	private function execute( callable $callback, int $status = 200 ): WP_REST_Response { try { $response = Envelope::success( $callback(), array(), $status ); $response->header( 'Cache-Control', 'no-store' ); return $response; } catch ( ValidationException $e ) { return Envelope::error( 'instascore_commerce_validation', $e->getMessage(), $e->errors(), 422 ); } catch ( \Throwable $e ) { do_action( 'instascore_log_error', $e ); return Envelope::error( 'instascore_commerce_failed', 'The commerce request could not be completed.', array(), 500 ); } }
}
