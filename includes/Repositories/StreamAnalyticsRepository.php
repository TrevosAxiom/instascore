<?php
/** Livestream viewing and sponsorship persistence. @package InstaScore_Platform */
namespace InstaScore\Platform\Repositories;
use wpdb;
final class StreamAnalyticsRepository {
	private readonly string $prefix;
	public function __construct( private readonly wpdb $database ) { $this->prefix = $database->prefix . 'instascore_'; }
	public function fixture_context( string $uuid ): ?array {
		$row = $this->database->get_row( $this->database->prepare( "SELECT f.id fixture_id,f.competition_id,fs.id stream_id FROM {$this->prefix}fixtures f JOIN {$this->prefix}fixture_streams fs ON fs.fixture_id=f.id AND fs.provider='youtube' WHERE f.uuid = %s LIMIT 1", $uuid ), ARRAY_A );
		return is_array( $row ) ? $row : null;
	}
	public function record_session( array $context, string $hash, int $user_id, string $device, int $seconds, string $status ): void {
		$table = $this->prefix . 'stream_view_sessions'; $now = gmdate( 'Y-m-d H:i:s' );
		$existing = $this->database->get_row( $this->database->prepare( "SELECT id,watch_seconds FROM {$table} WHERE stream_id=%d AND session_hash=%s LIMIT 1", (int) $context['stream_id'], $hash ), ARRAY_A );
		if ( is_array( $existing ) ) {
			$this->database->update( $table, array( 'watch_seconds' => max( (int) $existing['watch_seconds'], $seconds ), 'status' => $status, 'last_seen_at' => $now, 'completed_at' => 'completed' === $status ? $now : null ), array( 'id' => (int) $existing['id'] ) ); return;
		}
		$this->database->insert( $table, array( 'uuid' => wp_generate_uuid4(), 'fixture_id' => (int) $context['fixture_id'], 'stream_id' => (int) $context['stream_id'], 'session_hash' => $hash, 'user_id' => $user_id ?: null, 'device_category' => $device, 'watch_seconds' => $seconds, 'status' => $status, 'started_at' => $now, 'last_seen_at' => $now, 'completed_at' => 'completed' === $status ? $now : null ) );
	}
	/** @return array<int,array<string,mixed>> */
	public function active_sponsors( int $fixture_id, int $competition_id ): array {
		$now = gmdate( 'Y-m-d H:i:s' );
		$rows = $this->database->get_results( $this->database->prepare( "SELECT * FROM {$this->prefix}stream_sponsors WHERE status='active' AND (fixture_id=%d OR (fixture_id IS NULL AND competition_id=%d) OR (fixture_id IS NULL AND competition_id IS NULL)) AND (starts_at IS NULL OR starts_at<=%s) AND (ends_at IS NULL OR ends_at>=%s) ORDER BY fixture_id DESC,competition_id DESC,id DESC", $fixture_id, $competition_id, $now, $now ), ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}
	public function sponsor( string $uuid ): ?array { $row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->prefix}stream_sponsors WHERE uuid=%s LIMIT 1", $uuid ), ARRAY_A ); return is_array( $row ) ? $row : null; }
	public function increment_sponsor( string $uuid, string $metric ): void { if ( ! in_array( $metric, array( 'impressions', 'clicks' ), true ) ) { return; } $this->database->query( $this->database->prepare( "UPDATE {$this->prefix}stream_sponsors SET {$metric}={$metric}+1,updated_at=%s WHERE uuid=%s", gmdate( 'Y-m-d H:i:s' ), $uuid ) ); }
	public function create_sponsor( array $values ): array { $values = array_merge( $values, array( 'uuid' => wp_generate_uuid4(), 'impressions' => 0, 'clicks' => 0, 'created_at' => gmdate( 'Y-m-d H:i:s' ), 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ) ); $this->database->insert( $this->prefix . 'stream_sponsors', $values ); return $values; }
	public function update_sponsor( string $uuid, array $values ): ?array {
		$row = $this->sponsor( $uuid );
		if ( null === $row ) { return null; }
		$values['updated_at'] = gmdate( 'Y-m-d H:i:s' );
		$this->database->update( $this->prefix . 'stream_sponsors', $values, array( 'id' => (int) $row['id'] ) );
		return array_merge( $row, $values );
	}
	/** @return array<string,mixed> */
	public function report(): array {
		$summary = $this->database->get_row( "SELECT COUNT(*) sessions,COUNT(DISTINCT fixture_id) fixtures,COALESCE(SUM(watch_seconds),0) watch_seconds,COALESCE(AVG(watch_seconds),0) average_watch_seconds FROM {$this->prefix}stream_view_sessions", ARRAY_A ) ?: array();
		$devices = $this->database->get_results( "SELECT device_category,COUNT(*) sessions,SUM(watch_seconds) watch_seconds FROM {$this->prefix}stream_view_sessions GROUP BY device_category ORDER BY sessions DESC", ARRAY_A );
		$sponsors = $this->database->get_results( "SELECT * FROM {$this->prefix}stream_sponsors ORDER BY created_at DESC", ARRAY_A );
		$fixtures = $this->database->get_results( "SELECT f.uuid fixture_uuid,CONCAT(ht.name,' vs ',at.name) fixture_name,COUNT(v.id) sessions,COALESCE(SUM(v.watch_seconds),0) watch_seconds,COALESCE(AVG(v.watch_seconds),0) average_watch_seconds FROM {$this->prefix}stream_view_sessions v JOIN {$this->prefix}fixtures f ON f.id=v.fixture_id JOIN {$this->prefix}teams ht ON ht.id=f.home_team_id JOIN {$this->prefix}teams at ON at.id=f.away_team_id GROUP BY f.id,f.uuid,ht.name,at.name ORDER BY sessions DESC LIMIT 100", ARRAY_A );
		$campaigns = $this->database->get_results( "SELECT CASE WHEN campaign_name='' THEN sponsor_name ELSE campaign_name END campaign_name,SUM(impressions) impressions,SUM(clicks) clicks FROM {$this->prefix}stream_sponsors GROUP BY CASE WHEN campaign_name='' THEN sponsor_name ELSE campaign_name END ORDER BY impressions DESC", ARRAY_A );
		return array( 'summary' => $summary, 'devices' => is_array( $devices ) ? $devices : array(), 'sponsors' => is_array( $sponsors ) ? $sponsors : array(), 'fixtures' => is_array( $fixtures ) ? $fixtures : array(), 'campaigns' => is_array( $campaigns ) ? $campaigns : array() );
	}
	public function entity_id( string $table, string $uuid ): ?int { $value = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$this->prefix}{$table} WHERE uuid=%s LIMIT 1", $uuid ) ); return null === $value ? null : (int) $value; }
}
