<?php
/** Security service privacy tests. @package InstaScore_Platform */

use InstaScore\Platform\Services\SecurityService;
use PHPUnit\Framework\TestCase;

final class SecurityServiceTest extends TestCase {
	public function test_security_event_hashes_identity_and_ip(): void {
		$database = new wpdb();
		$_SERVER['REMOTE_ADDR'] = '203.0.113.8';
		$_SERVER['HTTP_USER_AGENT'] = 'Test Browser';
		( new SecurityService( $database ) )->record( 'login_failed', 'warning', null, 'person@example.test' );
		$row = array_values( $database->rows['wp_instascore_security_events'] )[0];
		$this->assertSame( 64, strlen( (string) $row['identity_hash'] ) );
		$this->assertSame( 64, strlen( (string) $row['ip_hash'] ) );
		$this->assertStringNotContainsString( 'person@example.test', wp_json_encode( $row ) );
		$this->assertStringNotContainsString( '203.0.113.8', wp_json_encode( $row ) );
	}
}
