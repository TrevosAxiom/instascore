<?php

namespace InstaScore\Platform\Tests;

use DateTimeImmutable;
use InstaScore\Platform\Notifications\NotificationCategory;
use InstaScore\Platform\Notifications\PreferenceFilter;
use PHPUnit\Framework\TestCase;

final class NotificationPreferenceFilterTest extends TestCase {
	public function test_categories_include_milestone_eight_events(): void {
		$this->assertContains( 'score_change', NotificationCategory::all() );
		$this->assertContains( 'result_awaiting_confirmation', NotificationCategory::all() );
		$this->assertContains( 'fantasy_deadline', NotificationCategory::all() );
	}

	public function test_quiet_hours_filter_blocks_local_night_window(): void {
		$filter = new PreferenceFilter();

		$this->assertFalse(
			$filter->allows(
				array(
					'enabled'             => true,
					'quiet_hours_start'   => '22:00',
					'quiet_hours_end'     => '07:00',
					'timezone'            => 'Africa/Lagos',
				),
				new DateTimeImmutable( '2026-07-30 22:30:00 Africa/Lagos' )
			)
		);
	}

	public function test_disabled_category_is_rejected(): void {
		$this->assertFalse(
			( new PreferenceFilter() )->allows(
				array( 'enabled' => false ),
				new DateTimeImmutable( '2026-07-30 12:00:00 UTC' )
			)
		);
	}
}
