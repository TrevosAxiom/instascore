<?php
/** Team-manager roster requests and league approval workflow. @package InstaScore_Platform */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Auth\TeamPermissions;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\AuditRepository;
use InstaScore\Platform\Repositories\PlayerRepository;
use InstaScore\Platform\Repositories\RegistrationRepository;
use InstaScore\Platform\Repositories\SeasonRepository;
use InstaScore\Platform\Repositories\TeamRepository;
use wpdb;

final class RosterWorkflowService {
	public function __construct( private readonly wpdb $database ) {}
	public static function create(): self { global $wpdb; return new self( $wpdb ); }

	/** @return array<string,mixed> */
	public function workspace(): array {
		$team_uuids = $this->assigned_team_uuids();
		if ( array() === $team_uuids && ! current_user_can( 'instascore_manage_leagues' ) ) {
			return array( 'teams' => array(), 'requests' => array(), 'pendingCount' => 0 );
		}
		$prefix = $this->database->prefix . 'instascore_';
		$team_condition = current_user_can( 'instascore_manage_leagues' ) ? '1=1' : 't.uuid IN (' . implode( ',', array_fill( 0, count( $team_uuids ), '%s' ) ) . ')';
		$sql = "SELECT t.uuid,t.name,t.logo_url logoUrl,s.name sportName,
			(SELECT COUNT(*) FROM {$prefix}team_registrations r WHERE r.team_id=t.id AND r.status='active') rosterCount
			FROM {$prefix}teams t JOIN {$prefix}sports s ON s.id=t.sport_id WHERE t.status='active' AND {$team_condition} ORDER BY t.name";
		$teams = $this->database->get_results( $team_uuids && ! current_user_can( 'instascore_manage_leagues' ) ? $this->database->prepare( $sql, $team_uuids ) : $sql, ARRAY_A );
		$request_condition = current_user_can( 'instascore_manage_leagues' ) ? '1=1' : '(t.uuid IN (' . implode( ',', array_fill( 0, count( $team_uuids ), '%s' ) ) . ') OR tt.uuid IN (' . implode( ',', array_fill( 0, count( $team_uuids ), '%s' ) ) . '))';
		$request_sql = "SELECT q.uuid,q.request_type requestType,q.status,q.proposed_json proposedJson,q.requested_at requestedAt,q.reviewed_at reviewedAt,q.review_notes reviewNotes,
			t.uuid teamUuid,t.name teamName,tt.uuid targetTeamUuid,tt.name targetTeamName,p.uuid playerUuid,p.display_name playerName,se.uuid seasonUuid,se.name seasonName
			FROM {$prefix}roster_requests q JOIN {$prefix}teams t ON t.id=q.team_id LEFT JOIN {$prefix}teams tt ON tt.id=q.target_team_id JOIN {$prefix}players p ON p.id=q.player_id JOIN {$prefix}seasons se ON se.id=q.season_id
			WHERE {$request_condition} ORDER BY q.requested_at DESC LIMIT 100";
		$args = array_merge( $team_uuids, $team_uuids );
		$requests = $this->database->get_results( $args && ! current_user_can( 'instascore_manage_leagues' ) ? $this->database->prepare( $request_sql, $args ) : $request_sql, ARRAY_A );
		$presented = array_map( array( $this, 'present' ), is_array( $requests ) ? $requests : array() );
		return array( 'teams' => is_array( $teams ) ? $teams : array(), 'requests' => $presented, 'pendingCount' => count( array_filter( $presented, static fn( array $row ): bool => 'pending' === $row['status'] ) ) );
	}

	/** @param array<string,mixed> $input @return array<string,mixed> */
	public function submit( array $input ): array {
		$type = sanitize_key( (string) ( $input['requestType'] ?? '' ) );
		if ( ! in_array( $type, array( 'register', 'transfer', 'release', 'eligibility' ), true ) ) throw new ValidationException( array( 'requestType' => 'Choose a supported roster action.' ) );
		$teams = new TeamRepository( $this->database, 'teams' );
		$players = new PlayerRepository( $this->database, 'players' );
		$seasons = new SeasonRepository( $this->database, 'seasons' );
		$team_id = $teams->id_for_uuid( sanitize_text_field( (string) ( $input['teamUuid'] ?? '' ) ) );
		$target_id = empty( $input['targetTeamUuid'] ) ? null : $teams->id_for_uuid( sanitize_text_field( (string) $input['targetTeamUuid'] ) );
		$player_id = $players->id_for_uuid( sanitize_text_field( (string) ( $input['playerUuid'] ?? '' ) ) );
		$season_id = $seasons->id_for_uuid( sanitize_text_field( (string) ( $input['seasonUuid'] ?? '' ) ) );
		if ( null === $team_id || null === $player_id || null === $season_id || ( 'transfer' === $type && null === $target_id ) ) throw new ValidationException( array( 'request' => 'Team, player, season and transfer destination must be valid.' ) );
		if ( ! TeamPermissions::manage_registration_for_team_id( $team_id ) ) throw new ValidationException( array( 'teamUuid' => 'You cannot manage this team.' ) );
		$registration = ( new RegistrationRepository( $this->database, 'team_registrations' ) )->active_for_player_season( $player_id, $season_id );
		if ( 'register' !== $type && ( null === $registration || (int) $registration['team_id'] !== $team_id ) ) throw new ValidationException( array( 'playerUuid' => 'The player is not actively registered to this team for the selected season.' ) );
		if ( 'register' === $type && null !== $registration ) throw new ValidationException( array( 'playerUuid' => 'The player already has an active registration in this season.' ) );
		$proposed = array(
			'jerseyNumber' => '' === (string) ( $input['jerseyNumber'] ?? '' ) ? null : min( 999, max( 0, (int) $input['jerseyNumber'] ) ),
			'positionCode' => strtoupper( sanitize_text_field( (string) ( $input['positionCode'] ?? '' ) ) ),
			'eligibilityStatus' => sanitize_key( (string) ( $input['eligibilityStatus'] ?? 'pending' ) ),
			'notes' => sanitize_textarea_field( (string) ( $input['notes'] ?? '' ) ),
		);
		if ( ! in_array( $proposed['eligibilityStatus'], array( 'eligible', 'pending', 'suspended', 'ineligible' ), true ) ) throw new ValidationException( array( 'eligibilityStatus' => 'Choose a valid eligibility state.' ) );
		$table = $this->database->prefix . 'instascore_roster_requests';
		$uuid = wp_generate_uuid4();
		$inserted = $this->database->insert( $table, array( 'uuid' => $uuid, 'request_type' => $type, 'team_id' => $team_id, 'target_team_id' => $target_id, 'player_id' => $player_id, 'season_id' => $season_id, 'registration_id' => $registration['id'] ?? null, 'proposed_json' => wp_json_encode( $proposed ), 'status' => 'pending', 'requested_by' => get_current_user_id(), 'reviewed_by' => null, 'review_notes' => null, 'requested_at' => gmdate( 'Y-m-d H:i:s' ), 'reviewed_at' => null, 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ) );
		if ( false === $inserted ) throw new \RuntimeException( 'Roster request could not be saved.' );
		( new AuditRepository( $this->database ) )->record( 'roster_request', $uuid, 'submitted', null, array( 'requestType' => $type, 'teamId' => $team_id, 'playerId' => $player_id ) );
		return array( 'uuid' => $uuid, 'status' => 'pending', 'requestType' => $type );
	}

	/** @return array<string,mixed> */
	public function review( string $uuid, string $decision, string $notes ): array {
		if ( ! current_user_can( 'instascore_manage_leagues' ) ) throw new ValidationException( array( 'permission' => 'League approval is required.' ) );
		if ( ! in_array( $decision, array( 'approve', 'reject' ), true ) ) throw new ValidationException( array( 'decision' => 'Choose approve or reject.' ) );
		$table = $this->database->prefix . 'instascore_roster_requests';
		$request = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$table} WHERE uuid=%s LIMIT 1", $uuid ), ARRAY_A );
		if ( ! is_array( $request ) || 'pending' !== $request['status'] ) throw new ValidationException( array( 'request' => 'The pending request was not found.' ) );
		try {
			if ( 'approve' === $decision ) $this->apply( $request );
			$status = 'approve' === $decision ? 'approved' : 'rejected';
			$updated = $this->database->update( $table, array( 'status' => $status, 'reviewed_by' => get_current_user_id(), 'review_notes' => sanitize_textarea_field( $notes ), 'reviewed_at' => gmdate( 'Y-m-d H:i:s' ), 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ), array( 'uuid' => $uuid ) );
			if ( false === $updated ) throw new \RuntimeException( 'Roster review could not be saved.' );
			( new AuditRepository( $this->database ) )->record( 'roster_request', $uuid, $status, $request, array( 'status' => $status, 'notes' => $notes ) );
			return array( 'uuid' => $uuid, 'status' => $status );
		} catch ( \Throwable $error ) { throw $error; }
	}

	/** @param array<string,mixed> $request */
	private function apply( array $request ): void {
		$proposed = json_decode( (string) $request['proposed_json'], true );
		$proposed = is_array( $proposed ) ? $proposed : array();
		$teams = new TeamRepository( $this->database, 'teams' ); $players = new PlayerRepository( $this->database, 'players' ); $seasons = new SeasonRepository( $this->database, 'seasons' );
		$team = $teams->find_by_id( 'transfer' === $request['request_type'] ? (int) $request['target_team_id'] : (int) $request['team_id'] );
		$player = $players->find_by_id( (int) $request['player_id'] ); $season = $seasons->find_by_id( (int) $request['season_id'] );
		if ( ! $team || ! $player || ! $season ) throw new ValidationException( array( 'request' => 'A roster dependency no longer exists.' ) );
		$current = null === $request['registration_id'] ? null : ( new RegistrationRepository( $this->database, 'team_registrations' ) )->find_by_id( (int) $request['registration_id'] );
		$input = array( 'teamUuid' => $team['uuid'], 'playerUuid' => $player['uuid'], 'seasonUuid' => $season['uuid'], 'jerseyNumber' => $proposed['jerseyNumber'] ?? ( $current['jersey_number'] ?? '' ), 'positionCode' => ( $proposed['positionCode'] ?? '' ) ?: ( $current['position_code'] ?? '' ), 'eligibilityStatus' => $proposed['eligibilityStatus'] ?? ( $current['eligibility_status'] ?? 'pending' ), 'notes' => ( $proposed['notes'] ?? '' ) ?: ( $current['notes'] ?? '' ) );
		$service = new TeamPlayerService( $this->database, new \InstaScore\Platform\Domain\TeamPlayerValidator() );
		if ( 'register' === $request['request_type'] ) $service->register_player( $input );
		elseif ( 'release' === $request['request_type'] ) $service->release_registration_by_id( (int) $request['registration_id'] );
		else {
			$registration = $current;
			if ( ! $registration ) throw new ValidationException( array( 'request' => 'The active registration no longer exists.' ) );
			$service->update_registration( (string) $registration['uuid'], $input );
		}
	}

	/** @return array<int,string> */
	private function assigned_team_uuids(): array {
		$value = get_user_meta( get_current_user_id(), 'instascore_team_assignments', true );
		return is_array( $value ) ? array_values( array_filter( array_map( 'sanitize_text_field', $value ) ) ) : array();
	}

	/** @param array<string,mixed> $row @return array<string,mixed> */
	private function present( array $row ): array {
		$row['proposed'] = json_decode( (string) ( $row['proposedJson'] ?? '{}' ), true ) ?: array(); unset( $row['proposedJson'] ); return $row;
	}
}
