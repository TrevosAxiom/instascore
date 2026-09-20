<?php
/** Production preflight, recovery manifest and safe cache controls. @package InstaScore_Platform */

namespace InstaScore\Platform\Services;

use wpdb;

final class ProductionReadinessService {
	public function __construct( private readonly wpdb $database ) {}
	public static function create(): self { global $wpdb; return new self( $wpdb ); }

	/** @return array<string,mixed> */
	public function report(): array {
		$checks = array(
			'database' => $this->database_check(), 'schedulers' => $this->scheduler_check(),
			'security' => $this->security_check(), 'backups' => $this->backup_check(),
			'performance' => $this->performance_check(), 'accessibility' => $this->accessibility_check(),
		);
		$failed = array_filter( $checks, static fn( array $check ): bool => 'ready' !== $check['status'] );
		$report = array( 'status' => array() === $failed ? 'ready' : 'attention', 'readyCount' => count( $checks ) - count( $failed ), 'checkCount' => count( $checks ), 'checks' => $checks, 'generatedAt' => gmdate( DATE_ATOM ) );
		update_option( 'instascore_production_readiness_report', $report, false );
		return $report;
	}

	/** Remove only InstaScore's disposable transients; persistent records are untouched. */
	public function purge_cache(): array {
		$like = $this->database->esc_like( '_transient_instascore_' ) . '%';
		$timeout_like = $this->database->esc_like( '_transient_timeout_instascore_' ) . '%';
		$deleted = (int) $this->database->query( $this->database->prepare( "DELETE FROM {$this->database->options} WHERE option_name LIKE %s OR option_name LIKE %s", $like, $timeout_like ) );
		if ( function_exists( 'wp_cache_flush_group' ) ) wp_cache_flush_group( 'instascore' );
		return array( 'status' => 'completed', 'message' => 'InstaScore runtime caches were cleared. Persistent records were preserved.', 'deleted' => max( 0, $deleted ), 'completedAt' => gmdate( DATE_ATOM ) );
	}

	/** @return array<string,mixed> */
	public function recovery_manifest(): array {
		$tables = $this->database->get_col( $this->database->prepare( 'SHOW TABLES LIKE %s', $this->database->esc_like( $this->database->prefix . 'instascore_' ) . '%' ) );
		$inventory = array();
		foreach ( $tables as $table ) {
			if ( ! preg_match( '/^[A-Za-z0-9_]+$/', (string) $table ) ) continue;
			$inventory[] = array( 'table' => (string) $table, 'rows' => max( 0, (int) $this->database->get_var( "SELECT COUNT(*) FROM {$table}" ) ) );
		}
		return array( 'format' => 'instascore-recovery-manifest-v1', 'generatedAt' => gmdate( DATE_ATOM ), 'pluginVersion' => INSTASCORE_PLATFORM_VERSION, 'databaseVersion' => (int) get_option( 'instascore_db_version', 0 ), 'siteFingerprint' => hash( 'sha256', home_url( '/' ) . wp_salt( 'auth' ) ), 'tables' => $inventory, 'checksums' => array( 'schema' => hash( 'sha256', wp_json_encode( $inventory ) ) ), 'restorePolicy' => 'Validate this manifest and take a host-level database backup before any restore. Secrets and row data are intentionally excluded.', 'redacted' => true );
	}

	private function database_check(): array {
		$report = get_option( 'instascore_database_integrity_report', array() ); $ready = 'healthy' === ( $report['status'] ?? '' );
		return array( 'status' => $ready ? 'ready' : 'attention', 'label' => 'Database integrity', 'detail' => $ready ? 'The latest integrity scan passed.' : 'Run a database integrity scan before release.' );
	}
	private function scheduler_check(): array {
		$hooks = array( 'instascore_database_maintenance', 'instascore_provider_watchdog', 'instascore_rss_import' );
		$missing = array_values( array_filter( $hooks, static fn( string $hook ): bool => false === wp_next_scheduled( $hook ) ) );
		return array( 'status' => array() === $missing ? 'ready' : 'attention', 'label' => 'Background schedulers', 'detail' => array() === $missing ? 'Core operational jobs are scheduled.' : 'Missing schedules: ' . implode( ', ', $missing ), 'missing' => $missing );
	}
	private function security_check(): array {
		$audit = get_option( 'instascore_security_capability_audit', array() ); $ready = is_ssl() && 0 === (int) ( $audit['missingCount'] ?? 1 );
		return array( 'status' => $ready ? 'ready' : 'attention', 'label' => 'Security baseline', 'detail' => $ready ? 'HTTPS and role capabilities are healthy.' : 'Confirm HTTPS and run the role security audit.', 'https' => is_ssl() );
	}
	private function backup_check(): array {
		$last = (string) get_option( 'instascore_last_verified_backup_at', '' ); $fresh = '' !== $last && strtotime( $last ) >= time() - ( 7 * DAY_IN_SECONDS );
		return array( 'status' => $fresh ? 'ready' : 'attention', 'label' => 'Recoverability', 'detail' => $fresh ? 'A backup was verified within seven days.' : 'Verify a host-level backup and record it in the control room.', 'lastVerifiedAt' => $last ?: null );
	}
	private function performance_check(): array {
		$assets = glob( INSTASCORE_PLATFORM_PATH . 'dist/assets/*.{js,css}', GLOB_BRACE ) ?: array(); $bytes = array_sum( array_map( 'filesize', $assets ) ); $ready = $bytes > 0 && $bytes <= 2 * 1024 * 1024;
		return array( 'status' => $ready ? 'ready' : 'attention', 'label' => 'Frontend asset budget', 'detail' => $ready ? 'Compiled assets are within the 2 MB production budget.' : 'Build assets are missing or exceed the 2 MB production budget.', 'bytes' => $bytes, 'budgetBytes' => 2 * 1024 * 1024 );
	}
	private function accessibility_check(): array {
		$css = is_readable( INSTASCORE_PLATFORM_PATH . 'src/styles.css' ) ? (string) file_get_contents( INSTASCORE_PLATFORM_PATH . 'src/styles.css' ) : '';
		$requirements = array( 'focusVisible' => str_contains( $css, ':focus-visible' ), 'reducedMotion' => str_contains( $css, 'prefers-reduced-motion' ), 'touchTargets' => str_contains( $css, 'min-height: 44px' ) ); $ready = ! in_array( false, $requirements, true );
		return array( 'status' => $ready ? 'ready' : 'attention', 'label' => 'Accessibility baseline', 'detail' => $ready ? 'Keyboard focus, reduced motion and minimum touch targets are present.' : 'One or more accessibility baseline styles are missing.', 'requirements' => $requirements );
	}
}
