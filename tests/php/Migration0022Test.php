<?php
/** Commerce schema tests. @package InstaScore_Platform */

use InstaScore\Platform\Database\Version0022;
use PHPUnit\Framework\TestCase;

final class Migration0022Test extends TestCase {
	public function test_commerce_schema_separates_catalogue_orders_items_and_entitlements(): void {
		$schema = ( new Version0022( new wpdb() ) )->schema();
		$this->assertStringContainsString( 'wp_instascore_commerce_products', $schema );
		$this->assertStringContainsString( 'wp_instascore_commerce_orders', $schema );
		$this->assertStringContainsString( 'wp_instascore_commerce_order_items', $schema );
		$this->assertStringContainsString( 'wp_instascore_commerce_entitlements', $schema );
		$this->assertStringContainsString( 'price_minor bigint', $schema );
		$this->assertStringContainsString( 'UNIQUE KEY access_code', $schema );
	}
}
