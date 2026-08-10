<?php

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Providers\FootballNormalizer;
use InstaScore\Platform\Providers\ProviderStatusMapper;
use PHPUnit\Framework\TestCase;

final class ProviderNormalizerTest extends TestCase {
	public function test_status_mapping_normalises_provider_statuses(): void {
		$this->assertSame( 'scheduled', ProviderStatusMapper::fixture_status( 'NS' ) );
		$this->assertSame( 'live', ProviderStatusMapper::fixture_status( '1H' ) );
		$this->assertSame( 'completed', ProviderStatusMapper::fixture_status( 'FT' ) );
		$this->assertSame( 'postponed', ProviderStatusMapper::fixture_status( 'PST' ) );
	}

	public function test_fixture_normalisation_does_not_leak_raw_provider_shape(): void {
		$normalised = ( new FootballNormalizer() )->fixtures(
			array(
				'response' => array(
					array(
						'fixture' => array(
							'id'     => 44,
							'date'   => '2026-08-01T17:00:00+00:00',
							'status' => array( 'short' => 'NS' ),
						),
						'league'  => array( 'id' => 12, 'season' => 2026 ),
						'teams'   => array(
							'home' => array( 'id' => 1 ),
							'away' => array( 'id' => 2 ),
						),
						'goals'   => array( 'home' => null, 'away' => null ),
					),
				),
			)
		);

		$this->assertSame( '44', $normalised[0]['providerId'] );
		$this->assertSame( 'scheduled', $normalised[0]['status'] );
		$this->assertArrayNotHasKey( 'fixture', $normalised[0] );
	}

	public function test_player_normalisation_includes_identity_team_and_position(): void {
		$normalised = ( new FootballNormalizer() )->players(
			array( 'response' => array( array(
				'player' => array( 'id' => 9, 'name' => 'Ada Striker', 'firstname' => 'Ada', 'lastname' => 'Striker', 'photo' => 'https://img.test/9.png' ),
				'statistics' => array( array( 'team' => array( 'id' => 4, 'name' => 'Lagos Stars' ), 'games' => array( 'position' => 'Attacker', 'number' => 10 ) ) ),
			) ) )
		);

		$this->assertSame( '9', $normalised[0]['providerId'] );
		$this->assertSame( '4', $normalised[0]['teamProviderId'] );
		$this->assertSame( 'Attacker', $normalised[0]['position'] );
	}

	public function test_standings_normalisation_flattens_api_football_groups(): void {
		$normalised = ( new FootballNormalizer() )->standings(
			array(
				'response' => array(
					array(
						'league' => array(
							'standings' => array(
								array(
									array(
										'rank'   => 1,
										'team'   => array( 'id' => 14 ),
										'points' => 21,
										'all'    => array( 'played' => 8, 'win' => 7, 'draw' => 0, 'lose' => 1, 'goals' => array( 'for' => 20, 'against' => 5 ) ),
									),
								),
							),
						),
					),
				),
			)
		);

		$this->assertCount( 1, $normalised );
		$this->assertSame( '14', $normalised[0]['teamProviderId'] );
		$this->assertSame( 21, $normalised[0]['points'] );
	}
}
