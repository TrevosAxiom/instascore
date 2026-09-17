<?php
/**
 * Integration secret encryption tests.
 *
 * @package InstaScore_Platform
 */

use InstaScore\Platform\Support\SecretVault;
use PHPUnit\Framework\TestCase;

final class SecretVaultTest extends TestCase {
	public function test_secrets_are_encrypted_and_can_be_decrypted(): void {
		$encrypted = SecretVault::encrypt( 'google-client-secret' );
		$this->assertNotSame( 'google-client-secret', $encrypted );
		$this->assertStringNotContainsString( 'google-client-secret', $encrypted );
		$this->assertSame( 'google-client-secret', SecretVault::decrypt( $encrypted ) );
	}

	public function test_invalid_ciphertext_is_not_returned_as_plaintext(): void {
		$this->assertSame( '', SecretVault::decrypt( 'sodium:not-valid-base64!' ) );
	}
}
