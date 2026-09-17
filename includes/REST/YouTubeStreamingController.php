<?php
/** YouTube streaming administration API. @package InstaScore_Platform */
namespace InstaScore\Platform\REST;

use InstaScore\Platform\Auth\FixturePermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\YouTubeLiveService;
use WP_REST_Request;
use WP_REST_Response;

final class YouTubeStreamingController {
	public function register(): void {
		$permission = array( FixturePermissions::class, 'manage_fixtures' );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube', array(
			array( 'methods' => 'GET', 'callback' => fn(): WP_REST_Response => Envelope::success( YouTubeLiveService::create()->settings() ), 'permission_callback' => $permission ),
			array( 'methods' => 'PUT', 'callback' => array( $this, 'settings' ), 'permission_callback' => $permission ),
		) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/connect', array( 'methods' => 'POST', 'callback' => array( $this, 'connect' ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/disconnect', array( 'methods' => 'POST', 'callback' => array( $this, 'disconnect' ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/broadcasts', array( 'methods' => 'GET', 'callback' => array( $this, 'broadcasts' ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/sync', array( 'methods' => 'POST', 'callback' => array( $this, 'sync' ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/health', array( 'methods' => 'GET', 'callback' => fn(): WP_REST_Response => Envelope::success( YouTubeLiveService::create()->health() ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/control-room', array( 'methods' => 'GET', 'callback' => array( $this, 'control_room' ), 'permission_callback' => $permission ) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/matches', array(
			array( 'methods' => 'POST', 'callback' => array( $this, 'attach' ), 'permission_callback' => $permission ),
			array( 'methods' => 'PUT', 'callback' => array( $this, 'auto_match' ), 'permission_callback' => $permission ),
		) );
		register_rest_route( 'instascore/v1', '/admin/streaming/youtube/callback', array( 'methods' => 'GET', 'callback' => array( $this, 'callback' ), 'permission_callback' => '__return_true' ) );
	}
	public function settings( WP_REST_Request $request ): WP_REST_Response { return Envelope::success( YouTubeLiveService::create()->save_credentials( (array) $request->get_json_params() ) ); }
	public function connect(): WP_REST_Response { return $this->execute( fn(): array => array( 'authorizationUrl' => YouTubeLiveService::create()->authorization_url( get_current_user_id() ) ) ); }
	public function disconnect(): WP_REST_Response { $service = YouTubeLiveService::create(); $service->disconnect(); return Envelope::success( $service->settings() ); }
	public function broadcasts(): WP_REST_Response { return $this->execute( fn(): array => YouTubeLiveService::create()->broadcasts() ); }
	public function sync(): WP_REST_Response { return $this->execute( fn(): array => YouTubeLiveService::create()->synchronize() ); }
	public function control_room(): WP_REST_Response { return $this->execute( fn(): array => YouTubeLiveService::create()->control_room() ); }
	public function attach( WP_REST_Request $request ): WP_REST_Response {
		$input = (array) $request->get_json_params();
		return $this->execute( fn(): array => YouTubeLiveService::create()->attach( sanitize_text_field( (string) ( $input['fixtureUuid'] ?? '' ) ), sanitize_text_field( (string) ( $input['videoId'] ?? '' ) ), get_current_user_id() ) );
	}
	public function auto_match(): WP_REST_Response { return $this->execute( fn(): array => YouTubeLiveService::create()->auto_match() ); }
	public function callback( WP_REST_Request $request ): WP_REST_Response {
		try {
			YouTubeLiveService::create()->complete_authorization( (string) $request->get_param( 'state' ), (string) $request->get_param( 'code' ) );
			$response = new WP_REST_Response( null, 302 ); $response->header( 'Location', home_url( '/admin/settings?youtube=connected' ) ); return $response;
		} catch ( \Throwable $error ) {
			$response = new WP_REST_Response( null, 302 ); $response->header( 'Location', home_url( '/admin/settings?youtube=error' ) ); return $response;
		}
	}
	private function execute( callable $callback ): WP_REST_Response {
		try { return Envelope::success( $callback() ); }
		catch ( ValidationException $error ) { return Envelope::error( 'instascore_youtube_validation_failed', $error->getMessage(), $error->errors(), 422 ); }
		catch ( \Throwable $error ) { do_action( 'instascore_log_error', $error ); return Envelope::error( 'instascore_youtube_failed', $error->getMessage(), array(), 502 ); }
	}
}
