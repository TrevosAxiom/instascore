<?php
/**
 * Health endpoint test.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Tests;

use InstaScore\Platform\REST\HealthController;
use PHPUnit\Framework\TestCase;
use WP_REST_Request;

final class HealthControllerTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['instascore_test_options']['instascore_db_version'] = INSTASCORE_DB_VERSION;
	}

	public function test_returns_safe_versioned_health_envelope(): void {
		$response = ( new HealthController() )->handle( new WP_REST_Request() );
		$payload  = $response->get_data();

		self::assertSame( 200, $response->get_status() );
		self::assertSame( 'ok', $payload['data']['status'] );
		self::assertSame( INSTASCORE_PLATFORM_VERSION, $payload['data']['pluginVersion'] );
		self::assertSame( INSTASCORE_DB_VERSION, $payload['data']['databaseVersion'] );
		self::assertSame( array(), $payload['errors'] );
	}
}
