<?php
/**
 * Public teams and players API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Repositories\PlayerRepository;
use InstaScore\Platform\Repositories\RegistrationRepository;
use InstaScore\Platform\Repositories\TeamRepository;
use WP_REST_Request;
use WP_REST_Response;

final class TeamPlayerController {
	public function register(): void {
		foreach ( array( 'teams', 'players' ) as $resource ) {
			register_rest_route(
				'instascore/v1',
				"/{$resource}",
				array(
					'methods'             => 'GET',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->index( $request, $resource ),
					'permission_callback' => '__return_true',
				)
			);
			register_rest_route(
				'instascore/v1',
				"/{$resource}/(?P<uuid>[0-9a-f-]{36})",
				array(
					'methods'             => 'GET',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->show( $request, $resource ),
					'permission_callback' => '__return_true',
				)
			);
		}
	}

	public function index( WP_REST_Request $request, string $resource ): WP_REST_Response {
		global $wpdb;
		$query      = array(
			'page'    => $request->get_param( 'page' ),
			'perPage' => $request->get_param( 'per_page' ),
			'sport'   => $request->get_param( 'sport' ),
			'search'  => $request->get_param( 'search' ),
			'team'    => $request->get_param( 'team' ),
			'position' => $request->get_param( 'position' ),
			'nationality' => $request->get_param( 'nationality' ),
			'eligibility' => $request->get_param( 'eligibility' ),
			'includeArchived' => rest_sanitize_boolean( $request->get_param( 'include_archived' ) ) && current_user_can( 'instascore_access_admin' ),
		);
		$page       = max( 1, (int) ( $query['page'] ? $query['page'] : 1 ) );
		$per_page   = min( 50, max( 1, (int) ( $query['perPage'] ? $query['perPage'] : 12 ) ) );
		$repository = 'teams' === $resource ? new TeamRepository( $wpdb, 'teams' ) : new PlayerRepository( $wpdb, 'players' );
		$result     = $repository->public_list( $query );
		$presenter  = 'teams' === $resource ? array( $this, 'present_team' ) : array( $this, 'present_player' );
		return Envelope::success(
			array_map( $presenter, $result['items'] ),
			array(
				'page'       => $page,
				'perPage'    => $per_page,
				'total'      => $result['total'],
				'totalPages' => (int) ceil( $result['total'] / $per_page ),
			)
		);
	}

	public function show( WP_REST_Request $request, string $resource ): WP_REST_Response {
		global $wpdb;
		$repository = 'teams' === $resource ? new TeamRepository( $wpdb, 'teams' ) : new PlayerRepository( $wpdb, 'players' );
		$row        = $repository->find_by_uuid( (string) $request['uuid'] );
		if ( null === $row || 'active' !== $row['status'] ) {
			return Envelope::error( 'instascore_not_found', 'Record not found.', array(), 404 );
		}
		$data = 'teams' === $resource ? $this->present_team( $row ) : $this->present_player( $row );
		if ( 'players' === $resource ) {
			$data['registrations'] = array_map( array( $this, 'present_registration' ), ( new RegistrationRepository( $wpdb, 'team_registrations' ) )->history_for_player( (int) $row['id'] ) );
		}
		return Envelope::success( $data );
	}

	private function present_team( array $row ): array {
		return array(
			'uuid'      => $row['uuid'],
			'name'      => $row['name'],
			'slug'      => $row['slug'],
			'shortName' => $row['short_name'] ?? '',
			'logoUrl'   => $row['logo_url'] ?? null,
			'sport'     => array(
				'uuid' => $row['sport_uuid'] ?? '',
				'name' => $row['sport_name'] ?? '',
				'slug' => $row['sport_slug'] ?? '',
			),
			'status'    => $row['status'],
		);
	}

	private function present_player( array $row ): array {
		$player = array(
			'uuid'              => $row['uuid'],
			'firstName'         => $row['first_name'],
			'lastName'          => $row['last_name'],
			'displayName'       => $row['display_name'],
			'slug'              => $row['slug'],
			'photoUrl'          => $row['photo_url'] ?? null,
			'dateOfBirth'       => $row['date_of_birth'] ?? null,
			'nationality'       => $row['nationality'] ?? '',
			'primaryPosition'   => $row['primary_position'] ?? '',
			'eligibilityStatus' => $row['eligibility_status'],
			'sport'             => array(
				'uuid' => $row['sport_uuid'] ?? '',
				'name' => $row['sport_name'] ?? '',
				'slug' => $row['sport_slug'] ?? '',
			),
			'status'            => $row['status'],
		);
		if ( ! empty( $row['team_uuid'] ) ) {
			$player['currentRegistration'] = array(
				'uuid'         => $row['registration_uuid'],
				'team'         => array(
					'uuid'    => $row['team_uuid'],
					'name'    => $row['team_name'],
					'logoUrl' => $row['team_logo_url'] ?? null,
				),
				'season'       => array(
					'uuid' => $row['season_uuid'],
					'name' => $row['season_name'],
				),
				'jerseyNumber' => null === $row['jersey_number'] ? null : (int) $row['jersey_number'],
				'positionCode' => $row['registration_position_code'] ?? '',
			);
		}
		return $player;
	}

	private function present_registration( array $row ): array {
		return array(
			'uuid'              => $row['uuid'],
			'team'              => array(
				'uuid' => $row['team_uuid'],
				'name' => $row['team_name'],
			),
			'season'            => array(
				'uuid' => $row['season_uuid'],
				'name' => $row['season_name'],
			),
			'jerseyNumber'      => null === $row['jersey_number'] ? null : (int) $row['jersey_number'],
			'positionCode'      => $row['position_code'],
			'eligibilityStatus' => $row['eligibility_status'],
			'registeredAt'      => $row['registered_at'],
			'unregisteredAt'    => $row['unregistered_at'],
			'status'            => $row['status'],
		);
	}
}
