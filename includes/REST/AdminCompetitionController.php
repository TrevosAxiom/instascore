<?php
/**
 * Protected competition administration API.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\REST;

use InstaScore\Platform\Auth\CompetitionPermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Services\CatalogService;
use InstaScore\Platform\Services\CompetitionService;
use WP_REST_Request;
use WP_REST_Response;

final class AdminCompetitionController {
	public function register(): void {
		foreach ( array( 'sports', 'stages', 'groups' ) as $entity ) {
			register_rest_route(
				'instascore/v1',
				"/admin/{$entity}",
				array(
					'methods'             => 'POST',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->catalog( $request, $entity ),
					'permission_callback' => array( $this, 'can_manage_leagues' ),
				)
			);
			register_rest_route(
				'instascore/v1',
				"/admin/{$entity}/(?P<uuid>[0-9a-f-]{36})",
				array(
					'methods'             => 'PATCH',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->catalog_update( $request, $entity ),
					'permission_callback' => array( $this, 'can_manage_leagues' ),
				)
			);
			register_rest_route(
				'instascore/v1',
				"/admin/{$entity}/(?P<uuid>[0-9a-f-]{36})/(?P<action>archive|restore)",
				array(
					'methods'             => 'POST',
					'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->catalog_status( $request, $entity ),
					'permission_callback' => array( $this, 'can_manage_leagues' ),
				)
			);
		}
		register_rest_route(
			'instascore/v1',
			'/admin/competitions',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_competition' ),
				'permission_callback' => array( $this, 'can_manage_leagues' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/competitions/(?P<uuid>[0-9a-f-]{36})',
			array(
				'methods'             => 'PATCH',
				'callback'            => array( $this, 'update_competition' ),
				'permission_callback' => array( $this, 'can_manage_requested_competition' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/seasons/(?P<uuid>[0-9a-f-]{36})',
			array(
				'methods'             => 'PATCH',
				'callback'            => array( $this, 'update_season' ),
				'permission_callback' => array( $this, 'can_manage_season' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/competitions/(?P<uuid>[0-9a-f-]{36})/seasons',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_season' ),
				'permission_callback' => array( $this, 'can_manage_requested_competition' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/competitions/(?P<uuid>[0-9a-f-]{36})/default-season',
			array(
				'methods'             => 'POST',
				'callback'            => fn( WP_REST_Request $request ): WP_REST_Response => $this->execute( fn(): array => CompetitionService::create()->set_default_season( (string) $request['uuid'], (string) $request->get_param( 'seasonUuid' ) ) ),
				'permission_callback' => array( $this, 'can_manage_requested_competition' ),
			)
		);
		register_rest_route(
			'instascore/v1',
			'/admin/(?P<entity>competitions|seasons)/(?P<uuid>[0-9a-f-]{36})/(?P<action>archive|restore)',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'status' ),
				'permission_callback' => array( $this, 'can_manage_status' ),
			)
		);
	}

	public function can_manage_leagues(): bool {
		return CompetitionPermissions::manage_leagues();
	}

	public function can_manage_requested_competition( WP_REST_Request $request ): bool {
		return CompetitionPermissions::manage_competition( (string) $request['uuid'] );
	}

	public function can_manage_season( WP_REST_Request $request ): bool {
		global $wpdb;
		$competition_uuid = ( new \InstaScore\Platform\Repositories\SeasonRepository( $wpdb, 'seasons' ) )->competition_uuid( (string) $request['uuid'] );
		return null !== $competition_uuid && CompetitionPermissions::manage_competition( $competition_uuid );
	}

	public function can_manage_status( WP_REST_Request $request ): bool {
		return 'seasons' === $request['entity']
			? $this->can_manage_season( $request )
			: $this->can_manage_requested_competition( $request );
	}

	public function create_competition( WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => CompetitionService::create()->create_competition( (array) $request->get_json_params() ), 201 );
	}

	public function create_season( WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => CompetitionService::create()->create_season( (string) $request['uuid'], (array) $request->get_json_params() ), 201 );
	}

	public function update_competition( WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => CompetitionService::create()->update_competition( (string) $request['uuid'], (array) $request->get_json_params() ) );
	}

	public function update_season( WP_REST_Request $request ): WP_REST_Response {
		return $this->execute( fn(): array => CompetitionService::create()->update_season( (string) $request['uuid'], (array) $request->get_json_params() ) );
	}

	public function catalog( WP_REST_Request $request, string $entity ): WP_REST_Response {
		global $wpdb;
		return $this->execute( fn(): array => ( new CatalogService( $wpdb ) )->create( $entity, (array) $request->get_json_params() ), 201 );
	}

	public function catalog_update( WP_REST_Request $request, string $entity ): WP_REST_Response {
		global $wpdb;
		return $this->execute( fn(): array => ( new CatalogService( $wpdb ) )->update( $entity, (string) $request['uuid'], (array) $request->get_json_params() ) );
	}

	public function catalog_status( WP_REST_Request $request, string $entity ): WP_REST_Response {
		global $wpdb;
		$status = 'archive' === $request['action'] ? 'archived' : 'active';
		return $this->execute( fn(): array => ( new CatalogService( $wpdb ) )->change_status( $entity, (string) $request['uuid'], $status ) );
	}

	public function status( WP_REST_Request $request ): WP_REST_Response {
		$status = 'archive' === $request['action'] ? 'archived' : 'active';
		return $this->execute( fn(): array => CompetitionService::create()->change_status( (string) $request['entity'], (string) $request['uuid'], $status ) );
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
