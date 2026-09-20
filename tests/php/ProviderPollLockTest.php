<?php
/** Provider polling lock tests. @package InstaScore_Platform */

use InstaScore\Platform\Support\ProviderPollLock;
use PHPUnit\Framework\TestCase;

final class ProviderPollLockTest extends TestCase {
	protected function setUp(): void { unset( $GLOBALS['instascore_test_options']['instascore_provider_poll_lock_football_live'] ); }

	public function test_only_one_worker_can_hold_a_poll_lock(): void {
		$token = ProviderPollLock::acquire( 'football', 'live', 60 );
		$this->assertNotNull( $token );
		$this->assertNull( ProviderPollLock::acquire( 'football', 'live', 60 ) );
		$this->assertNotNull( ProviderPollLock::status( 'football', 'live' ) );
	}

	public function test_only_the_owner_can_release_a_poll_lock(): void {
		$token = ProviderPollLock::acquire( 'football', 'live', 60 );
		ProviderPollLock::release( 'football', 'live', 'different-token' );
		$this->assertNull( ProviderPollLock::acquire( 'football', 'live', 60 ) );
		ProviderPollLock::release( 'football', 'live', (string) $token );
		$this->assertNotNull( ProviderPollLock::acquire( 'football', 'live', 60 ) );
	}

	public function test_expired_lock_is_reclaimed(): void {
		$GLOBALS['instascore_test_options']['instascore_provider_poll_lock_football_live'] = array( 'token' => 'old', 'acquiredAt' => time() - 100, 'expiresAt' => time() - 1 );
		$this->assertNotNull( ProviderPollLock::acquire( 'football', 'live', 60 ) );
	}
}
