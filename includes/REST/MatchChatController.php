<?php
/** Public match chat and protected moderation routes. @package InstaScore_Platform */
namespace InstaScore\Platform\REST;
use InstaScore\Platform\Auth\FixturePermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\MatchChatService;
use WP_REST_Request;
use WP_REST_Response;
final class MatchChatController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/fixtures/(?P<uuid>[0-9a-f-]{36})/chat', array(
			array( 'methods' => 'GET', 'callback' => array( $this, 'room' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => 'POST', 'callback' => array( $this, 'post' ), 'permission_callback' => 'is_user_logged_in' ),
		) );
		register_rest_route( 'instascore/v1', '/fantasy/games/(?P<uuid>[0-9a-f-]{36})/chat', array(
			array( 'methods' => 'GET', 'callback' => array( $this, 'fantasy_room' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => 'POST', 'callback' => array( $this, 'fantasy_post' ), 'permission_callback' => 'is_user_logged_in' ),
		) );
		register_rest_route( 'instascore/v1', '/chat/messages/(?P<uuid>[0-9a-f-]{36})/reactions', array( 'methods' => 'POST', 'callback' => array( $this, 'react' ), 'permission_callback' => 'is_user_logged_in' ) );
		register_rest_route( 'instascore/v1', '/chat/messages/(?P<uuid>[0-9a-f-]{36})/reports', array( 'methods' => 'POST', 'callback' => array( $this, 'report' ), 'permission_callback' => 'is_user_logged_in' ) );
		register_rest_route( 'instascore/v1', '/admin/chat/messages/(?P<uuid>[0-9a-f-]{36})', array( 'methods' => 'DELETE', 'callback' => array( $this, 'moderate' ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ) );
		register_rest_route( 'instascore/v1', '/admin/fixtures/(?P<fixture>[0-9a-f-]{36})/chat/messages/(?P<uuid>[0-9a-f-]{36})/ban', array( 'methods' => 'POST', 'callback' => array( $this, 'ban' ), 'permission_callback' => array( FixturePermissions::class, 'manage_fixtures' ) ) );
	}
	public function room( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => MatchChatService::create()->room( (string) $request['uuid'], get_current_user_id() ) ); }
	public function post( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => MatchChatService::create()->post( (string) $request['uuid'], (array) $request->get_json_params(), get_current_user_id() ) ); }
	public function fantasy_room( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => MatchChatService::create()->fantasy_room( (string) $request['uuid'], get_current_user_id() ) ); }
	public function fantasy_post( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => MatchChatService::create()->fantasy_post( (string) $request['uuid'], (array) $request->get_json_params(), get_current_user_id() ) ); }
	public function react( WP_REST_Request $request ): WP_REST_Response { $input = (array) $request->get_json_params(); return $this->execute( fn(): array => MatchChatService::create()->react( (string) $request['uuid'], (string) ( $input['reaction'] ?? '' ), get_current_user_id() ) ); }
	public function report( WP_REST_Request $request ): WP_REST_Response { $input = (array) $request->get_json_params(); return $this->execute( fn(): array => MatchChatService::create()->report( (string) $request['uuid'], (string) ( $input['reason'] ?? '' ), get_current_user_id() ) ); }
	public function moderate( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => MatchChatService::create()->moderate( (string) $request['uuid'] ) ); }
	public function ban( WP_REST_Request $request ): WP_REST_Response { return $this->execute( fn(): array => MatchChatService::create()->ban_author( (string) $request['fixture'], (string) $request['uuid'], get_current_user_id(), (array) $request->get_json_params() ) ); }
	private function execute( callable $callback ): WP_REST_Response { try { $response = Envelope::success( $callback() ); $response->header( 'Cache-Control', 'no-store' ); return $response; } catch ( ValidationException $error ) { return Envelope::error( 'instascore_chat_validation', $error->getMessage(), $error->errors(), 422 ); } catch ( \Throwable $error ) { do_action( 'instascore_log_error', $error ); return Envelope::error( 'instascore_chat_failed', 'Match banter is temporarily unavailable.', array(), 500 ); } }
}
