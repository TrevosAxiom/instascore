<?php
/** Canonical provider match persistence tests. @package InstaScore_Platform */

use InstaScore\Platform\Repositories\ProviderRepository;
use PHPUnit\Framework\TestCase;

final class ProviderCanonicalStoreTest extends TestCase {
	public function test_normalized_match_is_upserted_with_stable_provider_identity(): void {
		$database = new class() extends wpdb {
			public array $queries = array();
			public function query( string $sql ): int {
				$this->queries[] = $sql;
				return 1;
			}
		};
		$repository = new ProviderRepository( $database );
		$count = $repository->upsert_matches( 'api-football', 'football', array( array(
			'providerId' => '123', 'competitionProviderId' => '39', 'seasonProviderId' => '2026',
			'homeTeamProviderId' => '1', 'awayTeamProviderId' => '2',
			'kickoffAt' => '2026-09-20T18:00:00+01:00', 'status' => 'completed',
			'statusShort' => 'FT', 'homeScore' => 2, 'awayScore' => 1,
		) ) );

		$this->assertSame( 1, $count );
		$this->assertCount( 1, $database->queries );
		$this->assertStringContainsString( 'INSERT INTO wp_instascore_provider_matches', $database->queries[0] );
		$this->assertStringContainsString( 'ON DUPLICATE KEY UPDATE', $database->queries[0] );
		$this->assertStringContainsString( "NULLIF('", $database->queries[0] );
		$this->assertStringContainsString( "'api-football','football','123'", $database->queries[0] );
	}

	public function test_match_without_identity_or_kickoff_is_not_persisted(): void {
		$repository = new ProviderRepository( new wpdb() );
		$this->assertSame( 0, $repository->upsert_matches( 'provider', 'football', array( array( 'providerId' => '' ) ) ) );
	}
}
