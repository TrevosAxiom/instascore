<?php
/** Security event schema tests. @package InstaScore_Platform */

use InstaScore\Platform\Database\Version0020;
use PHPUnit\Framework\TestCase;

final class Migration0020Test extends TestCase {
	public function test_security_events_store_hashes_instead_of_raw_request_identity(): void {
		$schema = ( new Version0020( new wpdb() ) )->schema();
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_security_events', $schema );
		$this->assertStringContainsString( 'identity_hash char(64)', $schema );
		$this->assertStringContainsString( 'ip_hash char(64)', $schema );
		$this->assertStringNotContainsString( 'ip_address', $schema );
	}
}
