<?php
/**
 * Unified administration and operations service.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Repositories\OperationsRepository;

final class OperationsService {
	public function __construct( private readonly OperationsRepository $repository ) {}

	public static function create(): self {
		global $wpdb;
		return new self( new OperationsRepository( $wpdb ) );
	}

	public function dashboard(): array {
		$counts = $this->repository->counts();
		return array(
			'summary' => array(
				'competitions'                 => $counts['competitions'],
				'activeLiveFixtures'           => $counts['activeLiveFixtures'],
				'resultsAwaitingConfirmation'  => $counts['resultsAwaitingConfirmation'],
				'providerFailures'             => $counts['providerFailures'],
				'notificationFailures'         => $counts['notificationFailures'],
				'offlineSyncConflicts'         => $counts['offlineConflicts'],
				'eventConflicts'               => $counts['eventConflicts'],
				'openAlerts'                   => $counts['openAlerts'],
			),
			'settings' => $this->repository->settings(),
			'logs'     => array(
				'providerSync'          => $this->redact_rows( $this->repository->recent_rows( 'instascore_provider_sync_logs' ) ),
				'notificationDelivery'  => $this->redact_rows( $this->repository->recent_rows( 'instascore_notification_delivery_logs' ) ),
				'offlineSyncConflicts'  => $this->redact_rows( $this->repository->recent_rows( 'instascore_offline_event_queue', 'device_timestamp' ) ),
				'eventConflicts'        => $this->redact_rows( $this->repository->recent_rows( 'instascore_match_events' ) ),
				'audit'                 => $this->redact_rows( $this->repository->recent_rows( 'instascore_audit_logs' ) ),
				'operationsActions'     => $this->redact_rows( $this->repository->recent_rows( 'instascore_operations_actions' ) ),
				'operationsAlerts'      => $this->redact_rows( $this->repository->recent_rows( 'instascore_operations_alerts', 'updated_at' ) ),
				'securityEvents'        => $this->redact_rows( $this->repository->recent_rows( 'instascore_security_events' ) ),
			),
			'healthReport' => $this->health_report(),
		);
	}

	public function update_settings( array $input, int $user_id ): array {
		$settings = $this->repository->update_settings( $input );
		$this->repository->record_action( 'update_operations_settings', $user_id, $this->redact_array( $input ), $settings );
		return $settings;
	}

	public function action( string $action, array $input, int $user_id ): array {
		$allowed = array( 'retry_failed_jobs', 'standings_rebuild', 'fantasy_recalculation', 'diagnostic_report', 'production_preflight', 'runtime_cache_purge', 'verify_backup', 'security_audit', 'security_capability_repair', 'database_integrity_scan', 'database_retention_cleanup', 'database_safe_repair', 'bootstrap_cffl_lagos', 'football_live_sync', 'basketball_live_sync', 'nfl_live_sync' );
		if ( ! in_array( $action, $allowed, true ) ) {
			return array( 'status' => 'rejected', 'message' => 'Unsupported operation.' );
		}

		if ( 'diagnostic_report' === $action ) {
			$result = $this->diagnostic_report();
			$this->repository->record_export( 'diagnostic_report', $user_id, count( $result['sections'] ) );
		} elseif ( 'production_preflight' === $action ) {
			$result = ProductionReadinessService::create()->report();
			$result['message'] = 'Production preflight completed.';
			if ( 'ready' === $result['status'] ) {
				$this->repository->resolve_alert( 'production_readiness' );
			} else {
				$this->repository->open_alert( 'production_readiness', 'warning', 'Production preflight has checks requiring attention.', $result );
			}
		} elseif ( 'runtime_cache_purge' === $action ) {
			$result = ProductionReadinessService::create()->purge_cache();
		} elseif ( 'verify_backup' === $action ) {
			update_option( 'instascore_last_verified_backup_at', gmdate( DATE_ATOM ), false );
			$result = array( 'status' => 'completed', 'message' => 'The latest host-level backup was marked as verified.', 'verifiedAt' => gmdate( DATE_ATOM ) );
		} elseif ( 'bootstrap_cffl_lagos' === $action ) {
			$result = LeagueBootstrapService::create()->seed_cffl_lagos( $user_id );
		} elseif ( 'football_live_sync' === $action ) {
			$result = ProviderSyncService::create_for_sport( 'football' )->sync( 'live', array( 'source' => 'manual_operations_action' ), false );
		} elseif ( 'basketball_live_sync' === $action ) {
			$result = ProviderSyncService::create_for_sport( 'basketball' )->sync( 'live', array( 'source' => 'manual_operations_action' ), false );
		} elseif ( 'nfl_live_sync' === $action ) {
			$result = ProviderSyncService::create_for_sport( 'nfl' )->sync( 'live', array( 'source' => 'manual_operations_action' ), false );
		} elseif ( 'retry_failed_jobs' === $action ) {
			$jobs = array();
			foreach ( array( 'football', 'basketball', 'nfl' ) as $sport ) {
				if ( ! (bool) get_option( "instascore_provider_{$sport}_polling_enabled", false ) ) continue;
				$jobs[ $sport ] = ProviderSyncService::create_for_sport( $sport )->sync( 'live', array( 'source' => 'manual_retry_failed_jobs', 'attempt' => 1 ), false );
			}
			$result = array(
				'status'  => array() === $jobs ? 'skipped' : ( count( array_filter( $jobs, static fn( array $job ): bool => 'succeeded' === ( $job['status'] ?? '' ) ) ) === count( $jobs ) ? 'succeeded' : 'partial' ),
				'message' => array() === $jobs ? 'No enabled provider jobs are available to retry.' : 'Enabled provider live jobs were retried.',
				'jobs'    => $jobs,
			);
		} elseif ( 'database_integrity_scan' === $action ) {
			$result = DatabaseMaintenanceService::create()->integrity_report();
		} elseif ( 'database_retention_cleanup' === $action ) {
			$result = DatabaseMaintenanceService::create()->cleanup_retention();
		} elseif ( 'database_safe_repair' === $action ) {
			$result = DatabaseMaintenanceService::create()->safe_repair();
		} elseif ( 'security_audit' === $action ) {
			$result = SecurityService::create()->capability_audit();
		} elseif ( 'security_capability_repair' === $action ) {
			$result = SecurityService::create()->repair_capabilities();
		} else {
			$result = array(
				'status'    => 'queued',
				'action'    => $action,
				'message'   => 'Operation accepted for the existing domain worker/command pipeline.',
				'createdAt' => gmdate( 'c' ),
			);
		}

		$this->repository->record_action( $action, $user_id, $this->redact_array( $input ), $result );
		return $result;
	}

	public function export( string $type, int $user_id ): array {
		if ( 'recovery_manifest' === $type ) {
			$manifest = ProductionReadinessService::create()->recovery_manifest();
			$this->repository->record_export( $type, $user_id, count( $manifest['tables'] ) );
			return array( 'filename' => 'instascore-recovery-manifest-' . gmdate( 'Ymd-His' ) . '.json', 'content' => wp_json_encode( $manifest, JSON_PRETTY_PRINT ), 'mimeType' => 'application/json', 'redacted' => true );
		}
		if ( 'database_integrity' === $type ) {
			$rows = DatabaseMaintenanceService::create()->integrity_csv_rows();
			$this->repository->record_export( $type, $user_id, count( $rows ) - 1 );
			return array( 'filename' => 'instascore-database-integrity-' . gmdate( 'Ymd-His' ) . '.csv', 'content' => $this->csv( $rows ), 'redacted' => true );
		}
		$dashboard = $this->dashboard();
		$rows      = array(
			array( 'section', 'metric', 'value' ),
		);
		foreach ( $dashboard['summary'] as $metric => $value ) {
			$rows[] = array( 'summary', $metric, (string) $value );
		}
		foreach ( $dashboard['settings'] as $metric => $value ) {
			$rows[] = array( 'settings', $metric, is_scalar( $value ) ? (string) $value : wp_json_encode( $value ) );
		}
		$this->repository->record_export( $type, $user_id, count( $rows ) - 1 );
		return array(
			'filename' => 'instascore-' . sanitize_key( $type ) . '-' . gmdate( 'Ymd-His' ) . '.csv',
			'content'  => $this->csv( $rows ),
			'redacted' => true,
		);
	}

	private function health_report(): array {
		$provider_polling = array();
		foreach ( array( 'football', 'basketball', 'nfl' ) as $sport ) {
			$health = ProviderSyncService::create_for_sport( $sport )->health();
			$provider_polling[ $sport ] = $health['scheduleHealth'] ?? array();
		}
		return array(
			'pluginVersion' => INSTASCORE_PLATFORM_VERSION,
			'dbVersion'     => INSTASCORE_DB_VERSION,
			'platformRuntime' => get_bloginfo( 'version' ),
			'php'           => PHP_VERSION,
			'timezone'      => wp_timezone_string(),
			'generatedAt'   => gmdate( 'c' ),
			'providerPolling' => $provider_polling,
			'providerWatchdog' => get_option( 'instascore_provider_watchdog_last_run', array( 'checkedAt' => null, 'report' => array() ) ),
			'databaseMaintenance' => array( 'integrity' => get_option( 'instascore_database_integrity_report', array( 'status' => 'not_run' ) ), 'lastCleanup' => get_option( 'instascore_database_maintenance_last_cleanup', null ) ),
			'security' => get_option( 'instascore_security_capability_audit', array( 'status' => 'not_run', 'missingCount' => 0 ) ),
			'productionReadiness' => get_option( 'instascore_production_readiness_report', array( 'status' => 'not_run', 'readyCount' => 0, 'checkCount' => 6 ) ),
			'secrets'       => 'redacted',
		);
	}

	private function diagnostic_report(): array {
		return array(
			'generatedAt' => gmdate( 'c' ),
			'redacted'    => true,
			'sections'    => array(
				'health'   => $this->health_report(),
				'summary'  => $this->repository->counts(),
				'settings' => $this->repository->settings(),
			),
		);
	}

	private function redact_rows( array $rows ): array {
		return array_map( fn( array $row ): array => $this->redact_array( $row ), $rows );
	}

	private function redact_array( array $input ): array {
		$redacted = array();
		foreach ( $input as $key => $value ) {
			$key_string = strtolower( (string) $key );
			if ( preg_match( '/(secret|token|api[_-]?key|authorization|password|nonce|cookie)/', $key_string ) ) {
				$redacted[ $key ] = '[redacted]';
				continue;
			}
			if ( is_array( $value ) ) {
				$redacted[ $key ] = $this->redact_array( $value );
				continue;
			}
			if ( is_string( $value ) && preg_match( '/Bearer\s+[A-Za-z0-9._-]+|key=[A-Za-z0-9._-]+/i', $value ) ) {
				$redacted[ $key ] = '[redacted]';
				continue;
			}
			$redacted[ $key ] = is_string( $value ) && strlen( $value ) > 500 ? substr( $value, 0, 500 ) . '…[truncated]' : $value;
		}
		return $redacted;
	}

	private function csv( array $rows ): string {
		$lines = array();
		foreach ( $rows as $row ) {
			$escaped = array_map(
				fn( mixed $value ): string => '"' . str_replace( '"', '""', (string) $value ) . '"',
				$row
			);
			$lines[]  = implode( ',', $escaped );
		}
		return implode( "\n", $lines ) . "\n";
	}
}
