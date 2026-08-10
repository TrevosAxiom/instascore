<?php
/**
 * Public fixtures and results API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Repositories\FixtureRepository;
use WP_REST_Request;
use WP_REST_Response;

final class FixtureController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/fixtures',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->index( $request, false ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/results',
			array(
				'methods'             => 'GET',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->index( $request, true ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			'instascore/v1',
			'/fixtures/(?P<uuid>[0-9a-f-]{36})',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'show' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function index( WP_REST_Request $request, bool $results ): WP_REST_Response {
		global $wpdb;
		$page       = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );
		$per_page   = min( 50, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 12 ) ) );
		$repository = new FixtureRepository( $wpdb, 'fixtures' );
		$query      = array(
			'page'        => $page,
			'perPage'     => $per_page,
			'date'        => $request->get_param( 'date' ),
			'sport'       => $request->get_param( 'sport' ),
			'competition' => $request->get_param( 'competition' ),
			'results'     => $results,
		);
		$result     = $repository->public_list( $query );
		$response   = Envelope::success(
			array_map( array( $this, 'present' ), $result['items'] ),
			array(
				'page'       => $page,
				'perPage'    => $per_page,
				'total'      => $result['total'],
				'totalPages' => (int) ceil( $result['total'] / $per_page ),
			)
		);
		$response->header( 'Cache-Control', 'public, max-age=30, must-revalidate' );
		return $response;
	}

	public function show( WP_REST_Request $request ): WP_REST_Response {
		global $wpdb;
		$row = ( new FixtureRepository( $wpdb, 'fixtures' ) )->find_public_by_uuid( (string) $request['uuid'] );
		if ( null === $row ) {
			return Envelope::error( 'instascore_not_found', 'Fixture not found.', array(), 404 );
		}
		return Envelope::success( $this->present( $row ) );
	}

	public function present( array $row ): array {
		return array(
			'uuid'        => $row['uuid'],
			'status'      => $row['status'],
			'kickoffAt'   => $row['kickoff_at'],
			'timezone'    => $row['timezone'] ?? 'UTC',
			'roundName'   => $row['round_name'] ?? '',
			'matchDay'    => null === ( $row['match_day'] ?? null ) ? null : (int) $row['match_day'],
			'legNumber'   => null === ( $row['leg_number'] ?? null ) ? null : (int) $row['leg_number'],
			'bracketSlot' => $row['bracket_slot'] ?? '',
			'competition' => array( 'uuid' => $row['competition_uuid'] ?? '', 'name' => $row['competition_name'] ?? '' ),
			'season'      => array( 'uuid' => $row['season_uuid'] ?? '', 'name' => $row['season_name'] ?? '' ),
			'sport'       => array( 'uuid' => $row['sport_uuid'] ?? '', 'name' => $row['sport_name'] ?? '', 'slug' => $row['sport_slug'] ?? '' ),
			'homeTeam'    => array( 'uuid' => $row['home_team_uuid'] ?? '', 'name' => $row['home_team_name'] ?? '' ),
			'awayTeam'    => array( 'uuid' => $row['away_team_uuid'] ?? '', 'name' => $row['away_team_name'] ?? '' ),
			'venue'       => empty( $row['venue_uuid'] ) ? null : array( 'uuid' => $row['venue_uuid'], 'name' => $row['venue_name'] ?? '' ),
			'updatedAt'   => $row['updated_at'] ?? '',
		);
	}
}
