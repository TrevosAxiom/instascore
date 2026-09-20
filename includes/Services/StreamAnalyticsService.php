<?php
/** Privacy-conscious livestream analytics and sponsor operations. @package InstaScore_Platform */
namespace InstaScore\Platform\Services;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\StreamAnalyticsRepository;
final class StreamAnalyticsService {
	public function __construct( private readonly StreamAnalyticsRepository $repository ) {}
	public static function create(): self { global $wpdb; return new self( new StreamAnalyticsRepository( $wpdb ) ); }
	public function engage( string $fixture_uuid, array $input, int $user_id ): array {
		$context = $this->repository->fixture_context( $fixture_uuid ); if ( null === $context ) { throw new ValidationException( array( 'fixture' => 'stream_not_found' ) ); }
		$session = sanitize_text_field( (string) ( $input['sessionId'] ?? '' ) ); if ( strlen( $session ) < 16 || strlen( $session ) > 100 ) { throw new ValidationException( array( 'sessionId' => 'invalid' ) ); }
		$status = 'complete' === ( $input['action'] ?? '' ) ? 'completed' : 'active';
		$device = in_array( $input['device'] ?? '', array( 'mobile', 'tablet', 'desktop', 'tv', 'unknown' ), true ) ? $input['device'] : 'unknown';
		$seconds = min( 43200, max( 0, (int) ( $input['watchSeconds'] ?? 0 ) ) );
		$hash = hash_hmac( 'sha256', $fixture_uuid . '|' . $session, wp_salt( 'auth' ) );
		$this->repository->record_session( $context, $hash, $user_id, $device, $seconds, $status );
		return array( 'recorded' => true );
	}
	public function sponsors( string $fixture_uuid ): array {
		$context = $this->repository->fixture_context( $fixture_uuid ); if ( null === $context ) { return array(); }
		return array_map( array( $this, 'present_sponsor' ), $this->repository->active_sponsors( (int) $context['fixture_id'], (int) $context['competition_id'] ) );
	}
	public function sponsor_event( string $uuid, string $metric, string $session_id ): array {
		if ( ! in_array( $metric, array( 'impression', 'click' ), true ) || null === $this->repository->sponsor( $uuid ) ) { throw new ValidationException( array( 'sponsor' => 'not_found' ) ); }
		if ( strlen( $session_id ) < 16 || strlen( $session_id ) > 100 ) { throw new ValidationException( array( 'sessionId' => 'invalid' ) ); }
		$key = 'instascore_sponsor_' . substr( hash( 'sha256', $uuid . '|' . $metric . '|' . $session_id ), 0, 32 );
		if ( ! get_transient( $key ) ) { $this->repository->increment_sponsor( $uuid, 'click' === $metric ? 'clicks' : 'impressions' ); set_transient( $key, '1', DAY_IN_SECONDS ); }
		return array( 'recorded' => true );
	}
	public function create_sponsor( array $input, int $user_id ): array {
		$name = sanitize_text_field( (string) ( $input['sponsorName'] ?? '' ) ); if ( '' === $name ) { throw new ValidationException( array( 'sponsorName' => 'required' ) ); }
		$placement = sanitize_key( (string) ( $input['placement'] ?? 'pre_match' ) ); if ( ! in_array( $placement, array( 'pre_match', 'in_player', 'post_match' ), true ) ) { throw new ValidationException( array( 'placement' => 'invalid' ) ); }
		$competition_id = empty( $input['competitionUuid'] ) ? null : $this->repository->entity_id( 'competitions', sanitize_text_field( (string) $input['competitionUuid'] ) );
		$fixture_id = empty( $input['fixtureUuid'] ) ? null : $this->repository->entity_id( 'fixtures', sanitize_text_field( (string) $input['fixtureUuid'] ) );
		if ( ! empty( $input['competitionUuid'] ) && null === $competition_id ) { throw new ValidationException( array( 'competitionUuid' => 'not_found' ) ); }
		if ( ! empty( $input['fixtureUuid'] ) && null === $fixture_id ) { throw new ValidationException( array( 'fixtureUuid' => 'not_found' ) ); }
		$starts_at = $this->date( $input['startsAt'] ?? null ); $ends_at = $this->date( $input['endsAt'] ?? null );
		if ( null !== $starts_at && null !== $ends_at && $starts_at >= $ends_at ) { throw new ValidationException( array( 'endsAt' => 'must_be_after_start' ) ); }
		$row = $this->repository->create_sponsor( array(
			'competition_id' => $competition_id, 'fixture_id' => $fixture_id, 'sponsor_name' => $name,
			'campaign_name' => sanitize_text_field( (string) ( $input['campaignName'] ?? '' ) ), 'logo_url' => esc_url_raw( (string) ( $input['logoUrl'] ?? '' ) ),
			'destination_url' => esc_url_raw( (string) ( $input['destinationUrl'] ?? '' ) ), 'placement' => $placement,
			'starts_at' => $starts_at, 'ends_at' => $ends_at, 'status' => 'active', 'created_by' => $user_id,
		) );
		return $this->present_sponsor( $row );
	}
	public function update_sponsor( string $uuid, array $input ): array {
		$row = $this->repository->sponsor( $uuid );
		if ( null === $row ) { throw new ValidationException( array( 'sponsor' => 'not_found' ) ); }
		$values = array();
		if ( isset( $input['sponsorName'] ) ) { $values['sponsor_name'] = sanitize_text_field( (string) $input['sponsorName'] ); }
		if ( isset( $input['campaignName'] ) ) { $values['campaign_name'] = sanitize_text_field( (string) $input['campaignName'] ); }
		if ( isset( $input['logoUrl'] ) ) { $values['logo_url'] = esc_url_raw( (string) $input['logoUrl'] ); }
		if ( isset( $input['destinationUrl'] ) ) { $values['destination_url'] = esc_url_raw( (string) $input['destinationUrl'] ); }
		if ( isset( $input['placement'] ) && in_array( $input['placement'], array( 'pre_match', 'in_player', 'post_match' ), true ) ) { $values['placement'] = $input['placement']; }
		if ( isset( $input['status'] ) && in_array( $input['status'], array( 'active', 'paused', 'archived' ), true ) ) { $values['status'] = $input['status']; }
		if ( array_key_exists( 'startsAt', $input ) ) { $values['starts_at'] = $this->date( $input['startsAt'] ); }
		if ( array_key_exists( 'endsAt', $input ) ) { $values['ends_at'] = $this->date( $input['endsAt'] ); }
		$updated = $this->repository->update_sponsor( $uuid, $values );
		return $this->present_sponsor( $updated ?? $row );
	}
	public function report(): array {
		$data = $this->repository->report(); $summary = $data['summary'];
		return array(
			'summary' => array( 'sessions' => (int) ( $summary['sessions'] ?? 0 ), 'fixtures' => (int) ( $summary['fixtures'] ?? 0 ), 'watchSeconds' => (int) ( $summary['watch_seconds'] ?? 0 ), 'averageWatchSeconds' => (int) round( (float) ( $summary['average_watch_seconds'] ?? 0 ) ) ),
			'devices' => array_map( static fn( array $row ): array => array( 'device' => $row['device_category'], 'sessions' => (int) $row['sessions'], 'watchSeconds' => (int) $row['watch_seconds'] ), $data['devices'] ),
			'sponsors' => array_map( array( $this, 'present_sponsor' ), $data['sponsors'] ),
			'fixtures' => array_map( static fn( array $row ): array => array( 'fixtureUuid' => $row['fixture_uuid'], 'fixtureName' => $row['fixture_name'], 'sessions' => (int) $row['sessions'], 'watchSeconds' => (int) $row['watch_seconds'], 'averageWatchSeconds' => (int) round( (float) $row['average_watch_seconds'] ) ), $data['fixtures'] ),
			'campaigns' => array_map( static function ( array $row ): array { $impressions = (int) $row['impressions']; $clicks = (int) $row['clicks']; return array( 'campaignName' => $row['campaign_name'], 'impressions' => $impressions, 'clicks' => $clicks, 'clickThroughRate' => $impressions > 0 ? round( 100 * $clicks / $impressions, 2 ) : 0.0 ); }, $data['campaigns'] ),
		);
	}
	private function present_sponsor( array $row ): array { return array( 'uuid' => $row['uuid'], 'sponsorName' => $row['sponsor_name'], 'campaignName' => $row['campaign_name'] ?? '', 'logoUrl' => $row['logo_url'] ?? '', 'destinationUrl' => $row['destination_url'] ?? '', 'placement' => $row['placement'], 'status' => $row['status'], 'impressions' => (int) ( $row['impressions'] ?? 0 ), 'clicks' => (int) ( $row['clicks'] ?? 0 ), 'startsAt' => $row['starts_at'] ?? null, 'endsAt' => $row['ends_at'] ?? null ); }
	private function date( mixed $value ): ?string { if ( ! is_string( $value ) || '' === trim( $value ) ) { return null; } $time = strtotime( $value ); return false === $time ? null : gmdate( 'Y-m-d H:i:s', $time ); }
}
