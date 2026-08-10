<?php
/**
 * Milestone 3 validation rules.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

final class TeamPlayerValidator {
	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function team( array $input ): array {
		$name = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		if ( '' === $name || mb_strlen( $name ) > 160 ) {
			throw new ValidationException( array( 'name' => 'Enter a team name of 160 characters or fewer.' ) );
		}
		$sport_uuid = sanitize_text_field( (string) ( $input['sportUuid'] ?? '' ) );
		if ( ! wp_is_uuid( $sport_uuid ) ) {
			throw new ValidationException( array( 'sportUuid' => 'Select a valid sport.' ) );
		}
		return array(
			'name'            => $name,
			'slug'            => sanitize_title( (string) ( $input['slug'] ?? $name ) ),
			'sport_uuid'      => $sport_uuid,
			'short_name'      => sanitize_text_field( (string) ( $input['shortName'] ?? '' ) ),
			'home_venue_uuid' => sanitize_text_field( (string) ( $input['homeVenueUuid'] ?? '' ) ),
			'logo'            => $this->media( (array) ( $input['logo'] ?? array() ), 'logo' ),
		);
	}

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function player( array $input ): array {
		$first = sanitize_text_field( (string) ( $input['firstName'] ?? '' ) );
		$last  = sanitize_text_field( (string) ( $input['lastName'] ?? '' ) );
		if ( '' === $first || '' === $last || mb_strlen( $first ) > 100 || mb_strlen( $last ) > 100 ) {
			throw new ValidationException( array( 'name' => 'Enter first and last names of 100 characters or fewer.' ) );
		}
		$sport_uuid = sanitize_text_field( (string) ( $input['sportUuid'] ?? '' ) );
		if ( ! wp_is_uuid( $sport_uuid ) ) {
			throw new ValidationException( array( 'sportUuid' => 'Select a valid sport.' ) );
		}
		$eligibility = sanitize_key( (string) ( $input['eligibilityStatus'] ?? 'eligible' ) );
		if ( ! in_array( $eligibility, array( 'eligible', 'ineligible', 'suspended', 'pending' ), true ) ) {
			throw new ValidationException( array( 'eligibilityStatus' => 'Unsupported eligibility status.' ) );
		}
		$display = sanitize_text_field( (string) ( $input['displayName'] ?? trim( "{$first} {$last}" ) ) );
		return array(
			'first_name'         => $first,
			'last_name'          => $last,
			'display_name'       => $display,
			'slug'               => sanitize_title( (string) ( $input['slug'] ?? $display ) ),
			'sport_uuid'         => $sport_uuid,
			'date_of_birth'      => $this->optional_date( (string) ( $input['dateOfBirth'] ?? '' ), 'dateOfBirth' ),
			'nationality'        => strtoupper( sanitize_key( (string) ( $input['nationality'] ?? '' ) ) ),
			'primary_position'   => sanitize_key( (string) ( $input['primaryPosition'] ?? '' ) ),
			'eligibility_status' => $eligibility,
			'photo'              => $this->media( (array) ( $input['photo'] ?? array() ), 'photo' ),
		);
	}

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function registration( array $input ): array {
		foreach ( array( 'teamUuid', 'playerUuid', 'seasonUuid' ) as $key ) {
			if ( ! wp_is_uuid( sanitize_text_field( (string) ( $input[ $key ] ?? '' ) ) ) ) {
				throw new ValidationException( array( $key => 'Select a valid record.' ) );
			}
		}
		$jersey = '' === (string) ( $input['jerseyNumber'] ?? '' ) ? null : (int) $input['jerseyNumber'];
		if ( null !== $jersey && ( $jersey < 0 || $jersey > 999 ) ) {
			throw new ValidationException( array( 'jerseyNumber' => 'Jersey number must be between 0 and 999.' ) );
		}
		$status = sanitize_key( (string) ( $input['eligibilityStatus'] ?? 'eligible' ) );
		if ( ! in_array( $status, array( 'eligible', 'ineligible', 'suspended', 'pending' ), true ) ) {
			throw new ValidationException( array( 'eligibilityStatus' => 'Unsupported eligibility status.' ) );
		}
		return array(
			'team_uuid'          => sanitize_text_field( (string) $input['teamUuid'] ),
			'player_uuid'        => sanitize_text_field( (string) $input['playerUuid'] ),
			'season_uuid'        => sanitize_text_field( (string) $input['seasonUuid'] ),
			'jersey_number'      => $jersey,
			'position_code'      => sanitize_key( (string) ( $input['positionCode'] ?? '' ) ),
			'eligibility_status' => $status,
			'notes'              => sanitize_textarea_field( (string) ( $input['notes'] ?? '' ) ),
		);
	}

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function venue( array $input ): array {
		$name = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		if ( '' === $name || mb_strlen( $name ) > 160 ) {
			throw new ValidationException( array( 'name' => 'Enter a venue name of 160 characters or fewer.' ) );
		}
		return array(
			'name'         => $name,
			'slug'         => sanitize_title( (string) ( $input['slug'] ?? $name ) ),
			'city'         => sanitize_text_field( (string) ( $input['city'] ?? '' ) ),
			'country_code' => strtoupper( sanitize_key( (string) ( $input['countryCode'] ?? '' ) ) ),
			'address'      => sanitize_textarea_field( (string) ( $input['address'] ?? '' ) ),
		);
	}

	/**
	 * @param array<string,mixed> $input Input.
	 * @return array<string,mixed>
	 */
	public function official( array $input ): array {
		$name = sanitize_text_field( (string) ( $input['fullName'] ?? '' ) );
		if ( '' === $name || mb_strlen( $name ) > 160 ) {
			throw new ValidationException( array( 'fullName' => 'Enter an official name of 160 characters or fewer.' ) );
		}
		return array(
			'full_name'     => $name,
			'email'         => sanitize_email( (string) ( $input['email'] ?? '' ) ),
			'phone'         => sanitize_text_field( (string) ( $input['phone'] ?? '' ) ),
			'official_type' => sanitize_key( (string) ( $input['officialType'] ?? 'referee' ) ),
			'country_code'  => strtoupper( sanitize_key( (string) ( $input['countryCode'] ?? '' ) ) ),
		);
	}

	/**
	 * @param array<string,mixed> $media Media descriptor.
	 * @return array<string,mixed>
	 */
	public function media( array $media, string $field ): array {
		if ( array() === $media ) {
			return array(
				'attachment_id' => null,
				'url'           => null,
				'mime_type'     => null,
				'size_bytes'    => null,
			);
		}
		$mime = sanitize_text_field( (string) ( $media['mimeType'] ?? '' ) );
		$size = (int) ( $media['sizeBytes'] ?? 0 );
		if ( ! in_array( $mime, array( 'image/jpeg', 'image/png', 'image/webp' ), true ) ) {
			throw new ValidationException( array( $field => 'Images must be JPEG, PNG or WebP.' ) );
		}
		if ( $size <= 0 || $size > 2097152 ) {
			throw new ValidationException( array( $field => 'Images must be 2 MB or smaller.' ) );
		}
		return array(
			'attachment_id' => (int) ( $media['attachmentId'] ?? 0 ) ?: null,
			'url'           => esc_url_raw( (string) ( $media['url'] ?? '' ) ),
			'mime_type'     => $mime,
			'size_bytes'    => $size,
		);
	}

	private function optional_date( string $value, string $field ): ?string {
		if ( '' === $value ) {
			return null;
		}
		$stamp = strtotime( $value );
		if ( false === $stamp ) {
			throw new ValidationException( array( $field => 'Enter a valid date.' ) );
		}
		return gmdate( 'Y-m-d', $stamp );
	}
}
