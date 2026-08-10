<?php
/**
 * Live scoring validation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

final class ScoreEventValidator {
	public const EVENT_TYPES = array( 'touchdown', 'passing_touchdown', 'rushing_touchdown', 'receiving_touchdown', 'one_point_conversion', 'two_point_conversion', 'safety', 'interception', 'flag_pull', 'penalty', 'timeout', 'possession_change', 'player_of_the_match', 'period_start', 'period_end' );

	private const POINTS = array(
		'touchdown'            => 6,
		'passing_touchdown'    => 6,
		'rushing_touchdown'    => 6,
		'receiving_touchdown'  => 6,
		'one_point_conversion' => 1,
		'two_point_conversion' => 2,
		'safety'               => 2,
	);

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function event( array $input ): array {
		$errors = array();
		$type   = sanitize_key( (string) ( $input['eventType'] ?? '' ) );
		if ( ! in_array( $type, self::EVENT_TYPES, true ) ) {
			$errors['eventType'] = 'Unsupported flag-football event type.';
		}
		$client_id = sanitize_text_field( (string) ( $input['clientEventId'] ?? '' ) );
		if ( '' === $client_id ) {
			$errors['clientEventId'] = 'A client event ID is required for idempotency.';
		}
		$team_side = sanitize_key( (string) ( $input['teamSide'] ?? '' ) );
		if ( in_array( $type, array( 'touchdown', 'passing_touchdown', 'rushing_touchdown', 'receiving_touchdown', 'one_point_conversion', 'two_point_conversion', 'safety', 'interception', 'flag_pull', 'penalty', 'timeout', 'possession_change', 'player_of_the_match' ), true ) && ! in_array( $team_side, array( 'home', 'away' ), true ) ) {
			$errors['teamSide'] = 'Choose home or away for this event.';
		}
		if ( array() !== $errors ) {
			throw new ValidationException( $errors );
		}
		return array(
			'client_event_id'       => $client_id,
			'event_type'            => $type,
			'team_side'             => in_array( $team_side, array( 'home', 'away' ), true ) ? $team_side : null,
			'primary_player_uuid'   => sanitize_text_field( (string) ( $input['primaryPlayerUuid'] ?? '' ) ),
			'secondary_player_uuid' => sanitize_text_field( (string) ( $input['secondaryPlayerUuid'] ?? '' ) ),
			'period'                => max( 0, (int) ( $input['period'] ?? 0 ) ),
			'clock_seconds'         => max( 0, (int) ( $input['clockSeconds'] ?? 0 ) ),
			'points'                => self::POINTS[ $type ] ?? 0,
			'description'           => sanitize_textarea_field( (string) ( $input['description'] ?? '' ) ),
			'expected_revision'     => max( 0, (int) ( $input['expectedRevision'] ?? 0 ) ),
			'corrects_event_uuid'   => sanitize_text_field( (string) ( $input['correctsEventUuid'] ?? '' ) ),
		);
	}

	public function clock_action( string $action, string $status ): void {
		$allowed = array(
			'not_started' => array( 'start' ),
			'running'     => array( 'pause', 'period_end' ),
			'paused'      => array( 'resume', 'period_start' ),
			'period_end'  => array( 'period_start', 'complete' ),
			'completed'   => array(),
		);
		if ( ! in_array( $action, $allowed[ $status ] ?? array(), true ) ) {
			throw new ValidationException( array( 'clock' => "Cannot {$action} while clock is {$status}." ) );
		}
	}
}
