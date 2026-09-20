<?php
/** Livestream analytics and sponsorship REST API. @package InstaScore_Platform */
namespace InstaScore\Platform\REST;
use InstaScore\Platform\Auth\FixturePermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\StreamAnalyticsService;
use WP_REST_Request;
use WP_REST_Response;
final class StreamAnalyticsController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/fixtures/(?P<uuid>[0-9a-f-]{36})/broadcast/engagement', array( 'methods' => 'POST', 'callback' => array( $this, 'engage' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( 'instascore/v1', '/fixtures/(?P<uuid>[0-9a-f-]{36})/broadcast/sponsors', array( 'methods' => 'GET', 'callback' => array( $this, 'sponsors' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( 'instascore/v1', '/streaming/sponsors/(?P<uuid>[0-9a-f-]{36})/(?P<metric>impression|click)', array( 'methods' => 'POST', 'callback' => array( $this, 'sponsor_event' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( 'instascore/v1', '/admin/streaming/analytics', array(
			array( 'methods' => 'GET', 'callback' => fn(): WP_REST_Response => Envelope::success( StreamAnalyticsService::create()->report() ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ),
			array( 'methods' => 'POST', 'callback' => array( $this, 'create_sponsor' ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ),
		) );
		register_rest_route( 'instascore/v1', '/admin/streaming/sponsors/(?P<uuid>[0-9a-f-]{36})', array( 'methods' => 'PATCH', 'callback' => array( $this, 'update_sponsor' ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ) );
	}
	public function engage( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => StreamAnalyticsService::create()->engage( (string) $request['uuid'], (array) $request->get_json_params(), get_current_user_id() ) ); }
	public function sponsors( WP_REST_Request $request ): WP_REST_Response { return Envelope::success( StreamAnalyticsService::create()->sponsors( (string) $request['uuid'] ) ); }
	public function sponsor_event( WP_REST_Request $request ): WP_REST_Response { $input = (array) $request->get_json_params(); return $this->execute( fn(): array => StreamAnalyticsService::create()->sponsor_event( (string) $request['uuid'], (string) $request['metric'], sanitize_text_field( (string) ( $input['sessionId'] ?? '' ) ) ) ); }
	public function create_sponsor( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => StreamAnalyticsService::create()->create_sponsor( (array) $request->get_json_params(), get_current_user_id() ) ); }
	public function update_sponsor( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => StreamAnalyticsService::create()->update_sponsor( (string) $request['uuid'], (array) $request->get_json_params() ) ); }
	private function execute( callable $callback ): WP_REST_Response { try { return Envelope::success( $callback() ); } catch ( ValidationException $error ) { return Envelope::error( 'instascore_stream_analytics_validation', $error->getMessage(), $error->errors(), 422 ); } catch ( \Throwable $error ) { do_action( 'instascore_log_error', $error ); return Envelope::error( 'instascore_stream_analytics_failed', 'The livestream request could not be completed.', array(), 500 ); } }
}
