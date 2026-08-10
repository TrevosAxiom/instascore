<?php
/**
 * Administration and operations data access.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Repositories;

use wpdb;

final class OperationsRepository {
	public function __construct( private readonly wpdb $database ) {}

	public function counts(): array {
		return array(
			'competitions'               => $this->count_table( 'instascore_competitions' ),
			'activeLiveFixtures'         => $this->count_where( 'instascore_fixtures', "status IN ('warmup','live','halftime','interval','suspended')" ),
			'resultsAwaitingConfirmation' => $this->count_where( 'instascore_fixtures', "status = 'completed'" ),
			'providerFailures'           => $this->count_where( 'instascore_provider_sync_logs', "status IN ('failed','retrying')" ),
			'notificationFailures'       => $this->count_where( 'instascore_notification_delivery_logs', "status IN ('failed','retrying')" ),
			'offlineConflicts'           => $this->count_where( 'instascore_offline_event_queue', "sync_state = 'conflict'" ),
			'eventConflicts'             => $this->count_where( 'instascore_match_events', "status = 'conflict'" ),
			'openAlerts'                 => $this->count_where( 'instascore_operations_alerts', "status = 'open'" ),
		);
	}

	public function recent_rows( string $table, string $order_column = 'created_at', int $limit = 10 ): array {
		$allowed = array(
			'instascore_provider_sync_logs'      => array( 'created_at' ),
			'instascore_notification_delivery_logs' => array( 'created_at' ),
			'instascore_offline_event_queue'    => array( 'device_timestamp', 'created_at' ),
			'instascore_match_events'           => array( 'created_at', 'revision' ),
			'instascore_audit_logs'             => array( 'created_at' ),
			'instascore_operations_actions'     => array( 'created_at' ),
		);
		if ( ! isset( $allowed[ $table ] ) || ! in_array( $order_column, $allowed[ $table ], true ) ) {
			return array();
		}

		$table_name = $this->database->prefix . $table;
		if ( $this->database->get_var( $this->database->prepare( 'SHOW TABLES LIKE %s', $table_name ) ) !== $table_name ) {
			return array();
		}

		$limit = max( 1, min( 50, $limit ) );
		$rows  = $this->database->get_results( "SELECT * FROM {$table_name} ORDER BY {$order_column} DESC LIMIT {$limit}", ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public function feature_flags(): array {
		$flags = get_option( 'instascore_feature_flags', array() );
		return is_array( $flags ) ? $flags : array();
	}

	public function update_feature_flags( array $flags ): array {
		$clean = array();
		foreach ( $flags as $key => $value ) {
			$clean[ sanitize_key( (string) $key ) ] = (bool) $value;
		}
		update_option( 'instascore_feature_flags', $clean, false );
		return $clean;
	}

	public function settings(): array {
		return array(
			'maintenanceMode'                 => (bool) get_option( 'instascore_maintenance_mode', false ),
			'emergencyNotificationsDisabled' => (bool) get_option( 'instascore_admin_notification_disable', false ),
			'dataRetentionDays'               => (int) get_option( 'instascore_data_retention_days', 365 ),
			'featureFlags'                    => $this->feature_flags(),
			'providerSettings'                => array(
				'football'   => $this->provider_settings( 'football' ),
				'basketball' => $this->provider_settings( 'basketball' ),
			),
		);
	}

	public function update_settings( array $input ): array {
		if ( array_key_exists( 'maintenanceMode', $input ) ) {
			update_option( 'instascore_maintenance_mode', (bool) $input['maintenanceMode'], false );
		}
		if ( array_key_exists( 'emergencyNotificationsDisabled', $input ) ) {
			update_option( 'instascore_admin_notification_disable', (bool) $input['emergencyNotificationsDisabled'], false );
		}
		if ( array_key_exists( 'dataRetentionDays', $input ) ) {
			update_option( 'instascore_data_retention_days', max( 30, min( 2555, (int) $input['dataRetentionDays'] ) ), false );
		}
		if ( isset( $input['featureFlags'] ) && is_array( $input['featureFlags'] ) ) {
			$this->update_feature_flags( $input['featureFlags'] );
		}
		if ( isset( $input['providerSettings'] ) && is_array( $input['providerSettings'] ) ) {
			$this->update_provider_settings( $input['providerSettings'] );
		}
		return $this->settings();
	}

	private function provider_settings( string $sport ): array {
		$sport = 'basketball' === $sport ? 'basketball' : 'football';
		$key   = (string) get_option( "instascore_provider_{$sport}_api_key", '' );
		return array(
			'providerName'         => (string) get_option( "instascore_provider_{$sport}_name", "approved_{$sport}_provider" ),
			'baseUrl'             => 'football' === $sport ? 'https://v3.football.api-sports.io' : 'https://v1.basketball.api-sports.io',
			'apiKeyConfigured'    => '' !== $key,
			'pollingEnabled'      => (bool) get_option( "instascore_provider_{$sport}_polling_enabled", false ),
			'liveIntervalSeconds' => (int) get_option( "instascore_provider_{$sport}_live_interval_seconds", 60 ),
			'leagueIds'          => array_values( array_filter( array_map( 'strval', (array) get_option( "instascore_provider_{$sport}_league_ids", array() ) ) ) ),
		);
	}

	private function update_provider_settings( array $settings ): void {
		foreach ( array( 'football', 'basketball' ) as $sport ) {
			if ( ! isset( $settings[ $sport ] ) || ! is_array( $settings[ $sport ] ) ) {
				continue;
			}
			$input = $settings[ $sport ];
			if ( array_key_exists( 'providerName', $input ) ) {
				update_option( "instascore_provider_{$sport}_name", sanitize_key( (string) $input['providerName'] ), false );
			}
			if ( array_key_exists( 'apiKey', $input ) && '' !== (string) $input['apiKey'] ) {
				update_option( "instascore_provider_{$sport}_api_key", sanitize_text_field( (string) $input['apiKey'] ), false );
			}
			if ( ! empty( $input['clearApiKey'] ) ) {
				delete_option( "instascore_provider_{$sport}_api_key" );
			}
			if ( array_key_exists( 'pollingEnabled', $input ) ) {
				$enabled = rest_sanitize_boolean( $input['pollingEnabled'] );
				update_option( "instascore_provider_{$sport}_polling_enabled", $enabled, false );
				if ( ! $enabled ) {
					wp_clear_scheduled_hook( 'football' === $sport ? 'instascore_football_provider_sync' : 'instascore_basketball_provider_sync', array( 'live' ) );
				}
			}
			if ( array_key_exists( 'liveIntervalSeconds', $input ) ) {
				update_option( "instascore_provider_{$sport}_live_interval_seconds", max( 15, min( 3600, (int) $input['liveIntervalSeconds'] ) ), false );
			}
			if ( array_key_exists( 'leagueIds', $input ) ) {
				$raw = is_array( $input['leagueIds'] ) ? $input['leagueIds'] : explode( ',', (string) $input['leagueIds'] );
				$ids = array_values( array_unique( array_filter( array_map( static fn( $id ): string => sanitize_text_field( trim( (string) $id ) ), $raw ), 'ctype_digit' ) ) );
				update_option( "instascore_provider_{$sport}_league_ids", array_slice( $ids, 0, 100 ), false );
			}
		}
	}

	public function record_action( string $action, int $user_id, array $input, array $result, string $status = 'completed' ): array {
		$row = array(
			'uuid'         => wp_generate_uuid4(),
			'action'       => sanitize_key( $action ),
			'status'       => sanitize_key( $status ),
			'requested_by' => $user_id,
			'input_json'   => wp_json_encode( $input ) ?: '{}',
			'result_json'  => wp_json_encode( $result ) ?: '{}',
			'created_at'   => gmdate( 'Y-m-d H:i:s' ),
		);
		$this->database->insert( $this->database->prefix . 'instascore_operations_actions', $row );
		return $row;
	}

	public function record_export( string $type, int $user_id, int $rows ): array {
		$row = array(
			'uuid'         => wp_generate_uuid4(),
			'export_type'  => sanitize_key( $type ),
			'status'       => 'completed',
			'requested_by' => $user_id,
			'redacted'     => 1,
			'row_count'    => $rows,
			'created_at'   => gmdate( 'Y-m-d H:i:s' ),
		);
		$this->database->insert( $this->database->prefix . 'instascore_operations_exports', $row );
		return $row;
	}

	private function count_table( string $table ): int {
		return $this->count_where( $table, '1=1' );
	}

	private function count_where( string $table, string $where ): int {
		$allowed = array(
			'instascore_competitions',
			'instascore_fixtures',
			'instascore_provider_sync_logs',
			'instascore_notification_delivery_logs',
			'instascore_offline_event_queue',
			'instascore_match_events',
			'instascore_operations_alerts',
		);
		if ( ! in_array( $table, $allowed, true ) ) {
			return 0;
		}

		$table_name = $this->database->prefix . $table;
		if ( $this->database->get_var( $this->database->prepare( 'SHOW TABLES LIKE %s', $table_name ) ) !== $table_name ) {
			return 0;
		}
		return (int) $this->database->get_var( "SELECT COUNT(*) FROM {$table_name} WHERE {$where}" );
	}
}
