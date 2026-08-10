<?php
/**
 * External provider administration API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Services\ProviderSyncService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class ProviderController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/admin/providers/(?P<sport>football|basketball)/health',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => Envelope::success( ProviderSyncService::create_for_sport( sanitize_key( (string) $request['sport'] ) )->health() ),
				'permission_callback' => array( $this, 'permissions' ),
			)
		);

		register_rest_route(
			'instascore/v1',
			'/admin/providers/(?P<sport>football|basketball)/sync',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'sync' ),
				'permission_callback' => array( $this, 'permissions' ),
			)
		);

		register_rest_route(
			'instascore/v1',
			'/basketball/live',
			array(
				'methods'             => 'GET',
				'callback'            => fn(): WP_REST_Response => $this->basketball_live(),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/football/live',
			array(
				'methods'             => 'GET',
				'callback'            => fn(): WP_REST_Response => $this->provider_live( 'football' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/providers/(?P<sport>football|basketball)/(?P<period>upcoming|previous)',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->provider_matches( sanitize_key( (string) $request['sport'] ), sanitize_key( (string) $request['period'] ), sanitize_text_field( (string) $request->get_param( 'date' ) ) ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/football/(?P<period>upcoming|previous)',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->football_matches( sanitize_key( (string) $request['period'] ) ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/football/matches/(?P<provider_id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->football_match( sanitize_text_field( (string) $request['provider_id'] ) ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function permissions(): bool|WP_Error {
		if ( current_user_can( 'instascore_access_admin' ) ) {
			return true;
		}

		return new WP_Error( 'instascore_forbidden', __( 'Administrator access is required.', 'instascore-platform' ), array( 'status' => 403 ) );
	}

	public function sync( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		$sport  = sanitize_key( (string) ( $request['sport'] ?? 'football' ) );
		$result = ProviderSyncService::create_for_sport( $sport )->sync(
			sanitize_key( (string) ( $params['syncType'] ?? 'fixtures' ) ),
			is_array( $params['filters'] ?? null ) ? (array) $params['filters'] : array(),
			! empty( $params['dryRun'] )
		);

		return Envelope::success( $result, array(), 'failed' === $result['status'] ? 502 : 200 );
	}

	public function basketball_live(): WP_REST_Response {
		return $this->provider_live( 'basketball' );
	}

	public function provider_live( string $sport ): WP_REST_Response {
		$sport = 'basketball' === $sport ? 'basketball' : 'football';
		$cached   = ProviderSyncService::create_for_sport( $sport )->poll_live_if_stale();
		$response = Envelope::success(
			$cached['items'],
			array(
				'lastKnownAt' => $cached['lastKnownAt'],
				'cached'      => true,
				'sport'       => $sport,
			)
		);
		$response->header( 'Cache-Control', 'no-cache, must-revalidate' );
		return $response;
	}

	public function football_matches( string $period ): WP_REST_Response {
		return $this->provider_matches( 'football', $period );
	}

	public function provider_matches( string $sport, string $period, string $date = '' ): WP_REST_Response {
		$sport = 'basketball' === $sport ? 'basketball' : 'football';
		$period = 'previous' === $period ? 'previous' : 'upcoming';
		$service = ProviderSyncService::create_for_sport( $sport );
		$cached = '' !== $date
			? $service->matches_for_date( $period, $date )
			: ( 'upcoming' === $period ? $service->poll_upcoming_if_stale() : $service->poll_previous_if_stale() );
		$response = Envelope::success(
			$cached['items'],
			array( 'lastKnownAt' => $cached['lastKnownAt'], 'cached' => true, 'sport' => $sport, 'period' => $period, 'date' => $date ?: null )
		);
		$response->header( 'Cache-Control', 'public, max-age=60, must-revalidate' );
		return $response;
	}

	public function football_match( string $provider_id ): WP_REST_Response {
		$match = ProviderSyncService::create_for_sport( 'football' )->football_match_details( $provider_id );
		if ( null === $match ) {
			return Envelope::error( 'football_match_not_found', __( 'Soccer match could not be found.', 'instascore-platform' ), array(), 404 );
		}
		$response = Envelope::success( $match, array( 'cached' => true, 'sport' => 'football' ) );
		$response->header( 'Cache-Control', 'no-cache, must-revalidate' );
		return $response;
	}
}
