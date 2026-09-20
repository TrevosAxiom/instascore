<?php
/** Bounded database integrity, retention and repair operations. @package InstaScore_Platform */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Repositories\OperationsRepository;
use wpdb;

final class DatabaseMaintenanceService {
	public function __construct( private readonly wpdb $database, private readonly OperationsRepository $operations ) {}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb, new OperationsRepository( $wpdb ) );
	}

	/** @return array<string,mixed> */
	public function integrity_report(): array {
		$checks = array(
			'orphanFixtures' => $this->scalar( "SELECT COUNT(*) FROM {$this->table( 'fixtures' )} f LEFT JOIN {$this->table( 'competitions' )} c ON c.id=f.competition_id LEFT JOIN {$this->table( 'seasons' )} s ON s.id=f.season_id LEFT JOIN {$this->table( 'teams' )} h ON h.id=f.home_team_id LEFT JOIN {$this->table( 'teams' )} a ON a.id=f.away_team_id WHERE c.id IS NULL OR s.id IS NULL OR h.id IS NULL OR a.id IS NULL" ),
			'orphanRegistrations' => $this->scalar( "SELECT COUNT(*) FROM {$this->table( 'team_registrations' )} r LEFT JOIN {$this->table( 'teams' )} t ON t.id=r.team_id LEFT JOIN {$this->table( 'players' )} p ON p.id=r.player_id LEFT JOIN {$this->table( 'seasons' )} s ON s.id=r.season_id WHERE t.id IS NULL OR p.id IS NULL OR s.id IS NULL" ),
			'duplicateProviderMappings' => $this->scalar( "SELECT COUNT(*) FROM (SELECT provider_name,entity_type,provider_object_id FROM {$this->table( 'provider_mappings' )} GROUP BY provider_name,entity_type,provider_object_id HAVING COUNT(*) > 1) duplicates" ),
			'duplicateProviderMatches' => $this->scalar( "SELECT COUNT(*) FROM (SELECT provider_name,sport_slug,provider_match_id FROM {$this->table( 'provider_matches' )} GROUP BY provider_name,sport_slug,provider_match_id HAVING COUNT(*) > 1) duplicates" ),
			'incompleteProviderMatches' => $this->scalar( "SELECT COUNT(*) FROM {$this->table( 'provider_matches' )} WHERE provider_match_id='' OR competition_provider_id='' OR home_team_provider_id='' OR away_team_provider_id=''" ),
		);
		$issue_count = array_sum( $checks );
		$report = array( 'status' => 0 === $issue_count ? 'healthy' : 'attention', 'issueCount' => $issue_count, 'checks' => $checks, 'generatedAt' => gmdate( DATE_ATOM ) );
		update_option( 'instascore_database_integrity_report', $report, false );
		if ( $issue_count > 0 ) {
			$this->operations->open_alert( 'database_integrity', 'warning', "Database integrity scan found {$issue_count} records requiring review.", $report );
		} else {
			$this->operations->resolve_alert( 'database_integrity' );
		}
		return $report;
	}

	/** Delete only expired operational records; competition, team, player and fixture data are never touched. */
	public function cleanup_retention(): array {
		$days = max( 30, min( 2555, (int) get_option( 'instascore_data_retention_days', 365 ) ) );
		$cutoff = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );
		$targets = array(
			'provider_sync_logs' => "created_at < %s",
			'notification_delivery_logs' => "created_at < %s",
			'operations_actions' => "created_at < %s",
			'operations_exports' => "created_at < %s",
			'audit_logs' => "created_at < %s",
			'operations_alerts' => "status = 'resolved' AND updated_at < %s",
			'offline_event_queue' => "sync_state = 'synced' AND created_at < %s",
			'security_events' => "created_at < %s",
		);
		$deleted = array();
		foreach ( $targets as $entity => $where ) {
			$sql = $this->database->prepare( "DELETE FROM {$this->table( $entity )} WHERE {$where}", $cutoff );
			$result = $this->database->query( $sql );
			$deleted[ $entity ] = false === $result ? 0 : (int) $result;
		}
		$outcome = array( 'status' => 'completed', 'retentionDays' => $days, 'cutoff' => $cutoff, 'deleted' => $deleted, 'deletedTotal' => array_sum( $deleted ), 'completedAt' => gmdate( DATE_ATOM ) );
		update_option( 'instascore_database_maintenance_last_cleanup', $outcome, false );
		return $outcome;
	}

	/** Repair only rows that cannot be used safely; fixtures and primary records are preserved for review. */
	public function safe_repair(): array {
		$queries = array(
			'orphanRegistrations' => "DELETE r FROM {$this->table( 'team_registrations' )} r LEFT JOIN {$this->table( 'teams' )} t ON t.id=r.team_id LEFT JOIN {$this->table( 'players' )} p ON p.id=r.player_id LEFT JOIN {$this->table( 'seasons' )} s ON s.id=r.season_id WHERE t.id IS NULL OR p.id IS NULL OR s.id IS NULL",
			'incompleteProviderMappings' => "DELETE FROM {$this->table( 'provider_mappings' )} WHERE provider_object_id='' AND status='conflict'",
			'incompleteProviderMatches' => "DELETE FROM {$this->table( 'provider_matches' )} WHERE provider_match_id='' OR competition_provider_id='' OR home_team_provider_id='' OR away_team_provider_id=''",
		);
		$repaired = array();
		foreach ( $queries as $name => $sql ) {
			$result = $this->database->query( $sql );
			$repaired[ $name ] = false === $result ? 0 : (int) $result;
		}
		return array( 'status' => 'completed', 'repaired' => $repaired, 'repairedTotal' => array_sum( $repaired ), 'integrity' => $this->integrity_report(), 'completedAt' => gmdate( DATE_ATOM ) );
	}

	/** @return array<int,array<int,string>> */
	public function integrity_csv_rows(): array {
		$report = $this->integrity_report();
		$rows = array( array( 'check', 'count', 'generated_at' ) );
		foreach ( $report['checks'] as $check => $count ) $rows[] = array( (string) $check, (string) $count, (string) $report['generatedAt'] );
		return $rows;
	}

	private function scalar( string $sql ): int { return max( 0, (int) $this->database->get_var( $sql ) ); }
	private function table( string $entity ): string { return $this->database->prefix . 'instascore_' . $entity; }
}
