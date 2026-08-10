<?php
/**
 * Fixture scheduling validation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class FixtureValidator {
	public const STATUSES = array( 'draft', 'scheduled', 'warmup', 'live', 'halftime', 'interval', 'suspended', 'postponed', 'cancelled', 'abandoned', 'completed', 'confirmed' );

	private const TRANSITIONS = array(
		'draft'     => array( 'scheduled', 'cancelled' ),
		'scheduled' => array( 'draft', 'warmup', 'live', 'postponed', 'cancelled', 'suspended' ),
		'warmup'    => array( 'live', 'postponed', 'cancelled', 'suspended' ),
		'live'      => array( 'halftime', 'interval', 'suspended', 'abandoned', 'completed' ),
		'halftime'  => array( 'live', 'suspended', 'abandoned' ),
		'interval'  => array( 'live', 'suspended', 'abandoned' ),
		'suspended' => array( 'scheduled', 'live', 'postponed', 'abandoned', 'cancelled' ),
		'postponed' => array( 'scheduled', 'cancelled', 'abandoned' ),
		'completed' => array( 'confirmed' ),
		'confirmed' => array(),
		'cancelled' => array(),
		'abandoned' => array(),
	);

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function fixture( array $input, bool $partial = false ): array {
		$errors = array();
		$data   = array();
		foreach ( array( 'competitionUuid', 'seasonUuid', 'homeTeamUuid', 'awayTeamUuid', 'kickoffAt' ) as $field ) {
			if ( ! $partial && empty( $input[ $field ] ) ) {
				$errors[ $field ] = 'This field is required.';
			}
		}
		foreach ( array( 'competitionUuid', 'seasonUuid', 'stageUuid', 'groupUuid', 'homeTeamUuid', 'awayTeamUuid', 'venueUuid' ) as $field ) {
			if ( array_key_exists( $field, $input ) ) {
				$data[ $field ] = sanitize_text_field( (string) $input[ $field ] );
			}
		}
		$home = (string) ( $data['homeTeamUuid'] ?? '' );
		$away = (string) ( $data['awayTeamUuid'] ?? '' );
		if ( '' !== $home && $home === $away ) {
			$errors['awayTeamUuid'] = 'A fixture cannot use the same team as both home and away.';
		}
		if ( array_key_exists( 'status', $input ) ) {
			$status = sanitize_key( (string) $input['status'] );
			if ( ! in_array( $status, self::STATUSES, true ) ) {
				$errors['status'] = 'Unsupported fixture status.';
			}
			$data['status'] = $status;
		}
		if ( array_key_exists( 'kickoffAt', $input ) ) {
			$timezone = $this->timezone( (string) ( $input['timezone'] ?? 'UTC' ) );
			$utc      = $this->utc_datetime( (string) $input['kickoffAt'], $timezone );
			if ( null === $utc ) {
				$errors['kickoffAt'] = 'Kickoff must be a valid date and time.';
			}
			$data['kickoffAtUtc'] = $utc;
			$data['timezone']     = $timezone;
		}
		$data['roundName']   = isset( $input['roundName'] ) ? sanitize_text_field( (string) $input['roundName'] ) : '';
		$data['matchDay']    = isset( $input['matchDay'] ) && '' !== (string) $input['matchDay'] ? max( 1, (int) $input['matchDay'] ) : null;
		$data['legNumber']   = isset( $input['legNumber'] ) && '' !== (string) $input['legNumber'] ? max( 1, (int) $input['legNumber'] ) : null;
		$data['bracketSlot'] = isset( $input['bracketSlot'] ) ? sanitize_text_field( (string) $input['bracketSlot'] ) : '';
		$data['officials']   = $this->officials( $input['officials'] ?? array() );
		if ( array() !== $errors ) {
			throw new ValidationException( $errors );
		}
		return $data;
	}

	public function transition( string $from, string $to ): void {
		if ( ! in_array( $to, self::STATUSES, true ) ) {
			throw new ValidationException( array( 'status' => 'Unsupported fixture status.' ) );
		}
		if ( ! in_array( $to, self::TRANSITIONS[ $from ] ?? array(), true ) ) {
			throw new ValidationException( array( 'status' => "Cannot move a fixture from {$from} to {$to}." ) );
		}
	}

	private function timezone( string $timezone ): string {
		try {
			new DateTimeZone( $timezone );
			return $timezone;
		} catch ( Exception ) {
			return 'UTC';
		}
	}

	private function utc_datetime( string $value, string $timezone ): ?string {
		try {
			$date = new DateTimeImmutable( $value, new DateTimeZone( $timezone ) );
			return $date->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
		} catch ( Exception ) {
			return null;
		}
	}

	/**
	 * @return array<int,array{officialUuid:string,role:string}>
	 */
	private function officials( mixed $rows ): array {
		if ( ! is_array( $rows ) ) {
			return array();
		}
		$officials = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) || empty( $row['officialUuid'] ) ) {
				continue;
			}
			$officials[] = array(
				'officialUuid' => sanitize_text_field( (string) $row['officialUuid'] ),
				'role'         => sanitize_key( (string) ( $row['role'] ?? 'referee' ) ),
			);
		}
		return $officials;
	}
}
