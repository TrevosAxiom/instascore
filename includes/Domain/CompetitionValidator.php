<?php
/**
 * Competition-domain validation.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

use DateTimeImmutable;

final class CompetitionValidator {
	public const TYPES = array( 'league', 'cup', 'tournament', 'friendly', 'group' );

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function competition( array $input ): array {
		$errors = array();
		$name   = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		$type   = sanitize_key( (string) ( $input['type'] ?? '' ) );
		$sport  = sanitize_text_field( (string) ( $input['sportUuid'] ?? '' ) );
		$rules  = $input['rules'] ?? array();

		if ( '' === $name || mb_strlen( $name ) > 160 ) {
			$errors['name'] = 'Enter a competition name of 160 characters or fewer.';
		}
		if ( ! in_array( $type, self::TYPES, true ) ) {
			$errors['type'] = 'Select a supported competition type.';
		}
		if ( ! wp_is_uuid( $sport ) ) {
			$errors['sportUuid'] = 'Select a valid sport.';
		}
		if ( ! is_array( $rules ) || count( $rules ) > 30 ) {
			$errors['rules'] = 'Rules must be an object with no more than 30 entries.';
		}
		foreach ( (array) $rules as $key => $value ) {
			if ( ! is_string( $key ) || ! preg_match( '/^[a-z][a-z0-9_]{0,49}$/', $key ) || ! is_scalar( $value ) ) {
				$errors['rules'] = 'Rule keys and scalar values do not match the safe rule format.';
				break;
			}
		}

		$this->assert( $errors );
		return array(
			'name'        => $name,
			'slug'        => sanitize_title( (string) ( $input['slug'] ?? $name ) ),
			'type'        => $type,
			'sport_uuid'  => $sport,
			'description' => sanitize_textarea_field( (string) ( $input['description'] ?? '' ) ),
			'country'     => strtoupper( sanitize_text_field( (string) ( $input['countryCode'] ?? '' ) ) ),
			'rules'       => $rules,
			'logo'        => ( new TeamPlayerValidator() )->media( (array) ( $input['logo'] ?? array() ), 'logo' ),
		);
	}

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,string>
	 */
	public function season( array $input ): array {
		$errors = array();
		$name   = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		$start  = $this->date( (string) ( $input['startDate'] ?? '' ) );
		$end    = $this->date( (string) ( $input['endDate'] ?? '' ) );

		if ( '' === $name || mb_strlen( $name ) > 120 ) {
			$errors['name'] = 'Enter a season name of 120 characters or fewer.';
		}
		if ( null === $start ) {
			$errors['startDate'] = 'Enter a valid start date.';
		}
		if ( null === $end ) {
			$errors['endDate'] = 'Enter a valid end date.';
		}
		if ( null !== $start && null !== $end && $end < $start ) {
			$errors['endDate'] = 'The end date must be on or after the start date.';
		}

		$this->assert( $errors );
		return array(
			'name'       => $name,
			'slug'       => sanitize_title( (string) ( $input['slug'] ?? $name ) ),
			'start_date' => $start->format( 'Y-m-d' ),
			'end_date'   => $end->format( 'Y-m-d' ),
		);
	}

	private function date( string $value ): ?DateTimeImmutable {
		$date = DateTimeImmutable::createFromFormat( '!Y-m-d', $value );
		return $date && $date->format( 'Y-m-d' ) === $value ? $date : null;
	}

	/**
	 * @param array<string,string> $errors Errors.
	 */
	private function assert( array $errors ): void {
		if ( array() !== $errors ) {
			throw new ValidationException( $errors ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Structured domain data, not output.
		}
	}
}
