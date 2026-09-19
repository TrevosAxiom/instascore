<?php
/**
 * SPA route ownership tests.
 *
 * @package InstaScore_Platform
 */

use InstaScore\Platform\Support\Shortcode;
use PHPUnit\Framework\TestCase;

final class ShortcodeRouteTest extends TestCase {
	private string $original_request_uri = '';

	protected function setUp(): void {
		parent::setUp();
		$this->original_request_uri = (string) ( $_SERVER['REQUEST_URI'] ?? '' );
	}

	protected function tearDown(): void {
		$_SERVER['REQUEST_URI'] = $this->original_request_uri;
		parent::tearDown();
	}

	/** @dataProvider provider_match_routes */
	public function test_provider_match_routes_are_owned_by_the_spa( string $route ): void {
		$_SERVER['REQUEST_URI'] = $route;
		self::assertTrue( Shortcode::is_spa_request() );
	}

	/** @return array<string,array{string}> */
	public static function provider_match_routes(): array {
		return array(
			'soccer match'     => array( '/football/matches/12345' ),
			'basketball match' => array( '/basketball/matches/67890' ),
			'nfl match'        => array( '/nfl/matches/24680' ),
		);
	}
}
