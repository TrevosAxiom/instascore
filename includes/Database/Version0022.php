<?php
/** Commercial catalogue, orders and entitlement storage. @package InstaScore_Platform */

namespace InstaScore\Platform\Database;

use wpdb;

final class Version0022 implements Migration {
	public function __construct( private readonly wpdb $database ) {}
	public function version(): int { return 22; }
	public function name(): string { return 'create_commerce_domain'; }
	public function checksum(): string { return hash( 'sha256', $this->schema() ); }
	public function up(): void { require_once ABSPATH . 'wp-admin/includes/upgrade.php'; dbDelta( $this->schema() ); }
	public function schema(): string {
		$p = $this->database->prefix . 'instascore_'; $c = $this->database->get_charset_collate();
		return "CREATE TABLE {$p}commerce_products (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, product_type varchar(20) NOT NULL,
			name varchar(191) NOT NULL, slug varchar(191) NOT NULL, description text NULL, image_url text NULL,
			price_minor bigint(20) unsigned NOT NULL DEFAULT 0, currency char(3) NOT NULL DEFAULT 'NGN', stock_quantity int NULL,
			fixture_id bigint(20) unsigned NULL, billing_period varchar(20) NULL, status varchar(20) NOT NULL DEFAULT 'draft',
			metadata_json longtext NULL, created_at datetime NOT NULL, updated_at datetime NOT NULL,
			PRIMARY KEY (id), UNIQUE KEY uuid (uuid), UNIQUE KEY slug (slug), KEY type_status (product_type,status)
		) {$c};
		CREATE TABLE {$p}commerce_orders (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, order_number varchar(40) NOT NULL,
			user_id bigint(20) unsigned NOT NULL, status varchar(20) NOT NULL DEFAULT 'pending', payment_method varchar(30) NOT NULL DEFAULT 'manual',
			payment_reference varchar(191) NULL, subtotal_minor bigint(20) unsigned NOT NULL, total_minor bigint(20) unsigned NOT NULL,
			currency char(3) NOT NULL DEFAULT 'NGN', customer_json longtext NULL, notes text NULL,
			created_at datetime NOT NULL, paid_at datetime NULL, fulfilled_at datetime NULL, updated_at datetime NOT NULL,
			PRIMARY KEY (id), UNIQUE KEY uuid (uuid), UNIQUE KEY order_number (order_number), KEY user_status (user_id,status)
		) {$c};
		CREATE TABLE {$p}commerce_order_items (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, order_id bigint(20) unsigned NOT NULL, product_id bigint(20) unsigned NOT NULL,
			product_name varchar(191) NOT NULL, product_type varchar(20) NOT NULL, quantity int unsigned NOT NULL,
			unit_price_minor bigint(20) unsigned NOT NULL, total_minor bigint(20) unsigned NOT NULL, metadata_json longtext NULL,
			PRIMARY KEY (id), KEY order_id (order_id), KEY product_id (product_id)
		) {$c};
		CREATE TABLE {$p}commerce_entitlements (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT, uuid char(36) NOT NULL, user_id bigint(20) unsigned NOT NULL,
			order_id bigint(20) unsigned NOT NULL, product_id bigint(20) unsigned NOT NULL, entitlement_type varchar(20) NOT NULL,
			access_code varchar(64) NULL, status varchar(20) NOT NULL DEFAULT 'active', starts_at datetime NOT NULL, ends_at datetime NULL,
			redeemed_at datetime NULL, metadata_json longtext NULL, created_at datetime NOT NULL, updated_at datetime NOT NULL,
			PRIMARY KEY (id), UNIQUE KEY uuid (uuid), UNIQUE KEY access_code (access_code), KEY user_status (user_id,status), KEY product_status (product_id,status)
		) {$c};";
	}
}
