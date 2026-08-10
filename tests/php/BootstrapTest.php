<?php
/**
 * Plugin bootstrap test.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\Bootstrap;
use PHPUnit\Framework\TestCase;

final class BootstrapTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['instascore_test_actions'] = array();
	}

	public function test_registers_runtime_hooks(): void {
		Bootstrap::instance()->register();

		self::assertArrayHasKey( 'plugins_loaded', $GLOBALS['instascore_test_actions'] );
		self::assertArrayHasKey( 'rest_api_init', $GLOBALS['instascore_test_actions'] );
		self::assertArrayHasKey( 'init', $GLOBALS['instascore_test_actions'] );
		self::assertArrayHasKey( 'wp_enqueue_scripts', $GLOBALS['instascore_test_actions'] );
		self::assertArrayHasKey( 'wp_head', $GLOBALS['instascore_test_actions'] );
	}

	public function test_runtime_requires_php_82_or_newer(): void {
		self::assertTrue( version_compare( PHP_VERSION, '8.2.0', '>=' ) );
	}
}
