<?php
/**
 * Fantasy competition foundation tests.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Fantasy\FantasyRuleEngine;
use InstaScore\Platform\Repositories\FantasyRepository;
use InstaScore\Platform\Services\FantasyService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use wpdb;

final class FantasyFoundationTest extends TestCase {
	/** @return array<string,array{string,string}> */
	public static function position_examples(): array {
		return array(
			'quarterback' => array( 'QB', 'QB' ),
			'receiver'    => array( 'Wide Receiver', 'REC' ),
			'rusher'      => array( 'Rusher', 'RUSH' ),
			'defender'    => array( 'Cornerback', 'DEF' ),
			'unknown'     => array( 'Utility', 'FLEX' ),
		);
	}

	#[DataProvider( 'position_examples' )]
	public function test_roster_positions_are_mapped_to_fantasy_positions( string $source, string $expected ): void {
		$repository = new FantasyRepository( new wpdb() );
		$method     = new ReflectionMethod( $repository, 'fantasy_position_code' );
		self::assertSame( $expected, $method->invoke( $repository, $source ) );
	}

	public function test_game_creation_rejects_inconsistent_squad_sizes_before_writing(): void {
		$service = new FantasyService( new FantasyRepository( new wpdb() ) );
		$this->expectException( ValidationException::class );
		$service->create_game(
			array(
				'competitionUuid' => '00000000-0000-4000-8000-000000000001',
				'seasonUuid'      => '00000000-0000-4000-8000-000000000002',
				'name'            => 'CFFL Fantasy',
				'deadlineAt'      => gmdate( 'Y-m-d H:i:s', time() + 86400 ),
				'squadSize'       => 10,
				'startingSize'    => 7,
				'benchSize'       => 4,
			),
			1
		);
	}

	public function test_passing_touchdown_scores_passer_and_receiver_and_ignores_voided_events(): void {
		$engine = new FantasyRuleEngine();
		$rules  = array(
			array(
				'event_type' => 'passing_touchdown', 'points' => 4, 'version' => 2,
				'conditions_json' => wp_json_encode( array( 'secondaryPoints' => 6, 'secondaryLabel' => 'Touchdown reception' ) ),
			),
		);
		$events = array(
			array( 'id' => 10, 'fixture_id' => 20, 'event_type' => 'passing_touchdown', 'primary_player_id' => 30, 'secondary_player_id' => 31, 'voided_at' => null ),
			array( 'id' => 11, 'fixture_id' => 20, 'event_type' => 'passing_touchdown', 'primary_player_id' => 32, 'secondary_player_id' => 33, 'voided_at' => '2026-01-01 00:00:00' ),
		);
		$points = $engine->calculate_player_points( $events, $rules );

		self::assertCount( 2, $points );
		self::assertSame( array( 30, 31 ), array_column( $points, 'playerId' ) );
		self::assertSame( array( 4, 6 ), array_column( $points, 'points' ) );
	}

	public function test_squad_total_doubles_only_the_starting_captain(): void {
		$points = ( new FantasyRuleEngine() )->squad_total(
			array(
				array( 'points' => 8, 'slot_type' => 'starting', 'is_captain' => 1 ),
				array( 'points' => 5, 'slot_type' => 'starting', 'is_vice_captain' => 1 ),
				array( 'points' => 20, 'slot_type' => 'bench' ),
			)
		);
		self::assertSame( 21, $points );
	}
}
