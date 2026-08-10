<?php

use InstaScore\Platform\Domain\ScoreEventValidator;
use InstaScore\Platform\Domain\ValidationException;
use PHPUnit\Framework\TestCase;

final class ScoreEventValidationTest extends TestCase {
	public function test_requires_client_event_id_for_idempotency(): void {
		$this->expectException( ValidationException::class );
		( new ScoreEventValidator() )->event( array( 'eventType' => 'touchdown', 'teamSide' => 'home' ) );
	}

	public function test_maps_flag_football_points(): void {
		$event = ( new ScoreEventValidator() )->event(
			array(
				'clientEventId'    => 'client-1',
				'eventType'        => 'two_point_conversion',
				'teamSide'         => 'away',
				'expectedRevision' => 2,
			)
		);

		$this->assertSame( 2, $event['points'] );
		$this->assertSame( 2, $event['expected_revision'] );
	}

	public function test_rejects_invalid_clock_transition(): void {
		$this->expectException( ValidationException::class );
		( new ScoreEventValidator() )->clock_action( 'resume', 'not_started' );
	}
}
