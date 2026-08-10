<?php
/**
 * Protected teams, players and registrations API.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use InstaScore\Platform\Auth\TeamPermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\TeamPlayerService;
use InstaScore\Platform\Repositories\OfficialRepository;
use InstaScore\Platform\Repositories\VenueRepository;
use WP_REST_Request;
use WP_REST_Response;

final class AdminTeamPlayerController {
	public function register(): void {
		$routes = array(
			'/admin/teams'         => array( 'create_team', array( TeamPermissions::class, 'manage_teams' ) ),
			'/admin/players'       => array( 'create_player', array( TeamPermissions::class, 'manage_players' ) ),
			'/admin/venues'        => array( 'create_venue', array( TeamPermissions::class, 'manage_venues' ) ),
			'/admin/officials'     => array( 'create_official', array( TeamPermissions::class, 'manage_officials' ) ),
			'/admin/registrations' => array( 'register_player', array( TeamPermissions::class, 'manage_players' ) ),
		);
		foreach ( $routes as $route => $config ) {
			register_rest_route(
				'instascore/v1',
				$route,
				array(
					'methods'             => 'POST',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->call( $config[0], $request ),
					'permission_callback' => $config[1],
				)
			);
		}
		register_rest_route(
			'instascore/v1',
			'/admin/registrations/(?P<uuid>[0-9a-f-]{36})',
			array(
				'methods'             => 'PATCH',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => TeamPlayerService::create()->update_registration( (string) $request['uuid'], (array) $request->get_json_params() ) ),
				'permission_callback' => array( TeamPermissions::class, 'manage_players' ),
			)
		);
		$entity_permissions = array(
			'teams' => array( TeamPermissions::class, 'manage_teams' ),
			'players' => array( TeamPermissions::class, 'manage_players' ),
			'venues' => array( TeamPermissions::class, 'manage_venues' ),
			'officials' => array( TeamPermissions::class, 'manage_officials' ),
		);
		foreach ( $entity_permissions as $entity => $permission ) {
			register_rest_route(
				'instascore/v1',
				"/admin/{$entity}/(?P<uuid>[0-9a-f-]{36})",
				array(
					array(
						'methods'             => 'PATCH',
						'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->update( $entity, $request ),
						'permission_callback' => $permission,
					),
					array(
						'methods'             => 'DELETE',
						'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->status( $entity, $request, 'archived' ),
						'permission_callback' => $permission,
					),
				)
			);
			register_rest_route(
				'instascore/v1',
				"/admin/{$entity}/(?P<uuid>[0-9a-f-]{36})/(?P<action>archive|restore)",
				array(
					'methods'             => 'POST',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->status( $entity, $request, 'restore' === $request['action'] ? 'active' : 'archived' ),
					'permission_callback' => $permission,
				)
			);
		}
		foreach ( array( 'venues', 'officials' ) as $resource ) {
			register_rest_route(
				'instascore/v1',
				"/admin/{$resource}",
				array(
					'methods'             => 'GET',
					'callback'            => fn(): WP_REST_Response => $this->directory( $resource ),
					'permission_callback' => 'venues' === $resource ? array( TeamPermissions::class, 'manage_venues' ) : array( TeamPermissions::class, 'manage_officials' ),
				)
			);
		}
		register_rest_route(
			'instascore/v1',
			'/admin/registrations/import/preview',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->import_preview( $request ),
				'permission_callback' => array( TeamPermissions::class, 'manage_players' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/registrations/import/commit',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->import_commit( $request ),
				'permission_callback' => array( TeamPermissions::class, 'manage_players' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/registrations/import/template',
			array(
				'methods'             => 'GET',
				'callback'            => fn(): WP_REST_Response => Envelope::success(
					array(
						'filename' => 'instascore-registration-import-template.csv',
						'headers'  => array( 'teamUuid', 'playerUuid', 'seasonUuid', 'jerseyNumber', 'positionCode', 'eligibilityStatus', 'notes' ),
					)
				),
				'permission_callback' => array( TeamPermissions::class, 'manage_players' ),
			)
		);
	}

	public function call( string $method, WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => TeamPlayerService::create()->{$method}( (array) $request->get_json_params() ), 201 );
	}

	public function update( string $entity, WP_REST_Request $request ): WP_REST_Response {
		$method = 'update_' . rtrim( $entity, 's' );
		return $this->execute( fn(): array => TeamPlayerService::create()->{$method}( (string) $request['uuid'], (array) $request->get_json_params() ) );
	}

	public function status( string $entity, WP_REST_Request $request, string $status ): WP_REST_Response {
		return $this->execute( fn(): array => TeamPlayerService::create()->change_status( $entity, (string) $request['uuid'], $status ) );
	}

	public function directory( string $resource ): WP_REST_Response {
		global $wpdb;
		$rows = 'venues' === $resource
			? ( new VenueRepository( $wpdb, 'venues' ) )->admin_list()
			: ( new OfficialRepository( $wpdb, 'officials' ) )->admin_list();
		return Envelope::success(
			array_map(
				static fn( array $row ): array => 'venues' === $resource
					? array( 'uuid' => $row['uuid'], 'name' => $row['name'], 'city' => $row['city'], 'countryCode' => $row['country_code'], 'status' => $row['status'] )
					: array( 'uuid' => $row['uuid'], 'name' => $row['full_name'], 'email' => $row['email'], 'officialType' => $row['official_type'], 'countryCode' => $row['country_code'], 'status' => $row['status'] ),
				$rows
			)
		);
	}

	public function import_preview( WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => TeamPlayerService::create()->preview_registration_import( $this->rows( $request ) ) );
	}

	public function import_commit( WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => TeamPlayerService::create()->commit_registration_import( $this->rows( $request ) ), 201 );
	}

	/**
	 * @return array<int,array<string,mixed>>
	 */
	private function rows( WP_REST_Request $request ): array {
		$params = (array) $request->get_json_params();
		return isset( $params['rows'] ) && is_array( $params['rows'] ) ? $params['rows'] : array();
	}

	private function execute( callable $callback, int $status = 200 ): WP_REST_Response {
		try {
			return Envelope::success( $callback(), array(), $status );
		} catch ( ValidationException $error ) {
			return Envelope::error( 'instascore_validation_failed', $error->getMessage(), $error->errors(), 422 );
		} catch ( \Throwable $error ) {
			do_action( 'instascore_log_error', $error );
			return Envelope::error( 'instascore_mutation_failed', 'The change could not be saved.', array(), 500 );
		}
	}
}
