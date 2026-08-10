<?php
/**
 * Ordered schema migration runner.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

use RuntimeException;
use wpdb;

final class MigrationRunner {
	/**
	 * Construct the migration runner.
	 *
	 * @param wpdb  $database WordPress database connection.
	 * @param array $migrations Ordered migrations.
	 */
	public function __construct(
		private readonly wpdb $database,
		private readonly array $migrations
	) {}

	public static function create(): self {
		global $wpdb;

		return new self(
			$wpdb,
			array(
				new Version0001( $wpdb ),
				new Version0002( $wpdb ),
				new Version0003( $wpdb ),
				new Version0004( $wpdb ),
				new Version0005( $wpdb ),
				new Version0006( $wpdb ),
				new Version0007( $wpdb ),
				new Version0008( $wpdb ),
				new Version0009( $wpdb ),
				new Version0010( $wpdb ),
				new Version0011( $wpdb ),
				new Version0012( $wpdb ),
				new Version0013( $wpdb ),
				new Version0014(),
				new Version0015( $wpdb ),
			)
		);
	}

	public function run(): void {
		if ( get_transient( 'instascore_migration_lock' ) ) {
			return;
		}

		set_transient( 'instascore_migration_lock', '1', MINUTE_IN_SECONDS );

		try {
			$current_version = (int) get_option( 'instascore_db_version', 0 );

			foreach ( $this->migrations as $migration ) {
				if ( $migration->version() <= $current_version ) {
					continue;
				}

				$migration->up();
				$this->record( $migration );
				update_option( 'instascore_db_version', $migration->version(), false );
				$current_version = $migration->version();
			}
		} finally {
			delete_transient( 'instascore_migration_lock' );
		}
	}

	private function record( Migration $migration ): void {
		$result = $this->database->replace(
			$this->database->prefix . 'instascore_migrations',
			array(
				'version'    => $migration->version(),
				'name'       => $migration->name(),
				'checksum'   => $migration->checksum(),
				'applied_at' => gmdate( 'Y-m-d H:i:s' ),
			),
			array( '%d', '%s', '%s', '%s' )
		);

		if ( false === $result ) {
			throw new RuntimeException( 'Unable to record the InstaScore database migration.' );
		}
	}
}
