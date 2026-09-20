<?php
/** Commerce persistence. @package InstaScore_Platform */

namespace InstaScore\Platform\Repositories;

use wpdb;

final class CommerceRepository {
	public function __construct( private readonly wpdb $database ) {}
	private function table( string $name ): string { return $this->database->prefix . 'instascore_' . $name; }
	public function products( bool $admin = false ): array { $where = $admin ? '' : " WHERE status='active'"; return $this->database->get_results( "SELECT * FROM {$this->table( 'commerce_products' )}{$where} ORDER BY product_type,name", ARRAY_A ) ?: array(); }
	public function product( string $uuid ): ?array { $row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->table( 'commerce_products' )} WHERE uuid=%s", $uuid ), ARRAY_A ); return is_array( $row ) ? $row : null; }
	public function product_by_id( int $id ): ?array { $row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->table( 'commerce_products' )} WHERE id=%d", $id ), ARRAY_A ); return is_array( $row ) ? $row : null; }
	public function save_product( array $row, ?string $uuid = null ): array {
		$table = $this->table( 'commerce_products' ); $now = gmdate( 'Y-m-d H:i:s' );
		if ( null === $uuid ) { $row = array_merge( $row, array( 'uuid' => wp_generate_uuid4(), 'created_at' => $now, 'updated_at' => $now ) ); $this->database->insert( $table, $row ); $uuid = $row['uuid']; }
		else { $row['updated_at'] = $now; $this->database->update( $table, $row, array( 'uuid' => $uuid ) ); }
		return $this->product( $uuid ) ?? array();
	}
	public function create_order( array $order, array $items ): array {
		$this->database->query( 'START TRANSACTION' );
		try {
			$this->database->insert( $this->table( 'commerce_orders' ), $order ); $order_id = (int) $this->database->insert_id;
			foreach ( $items as $item ) { $item['order_id'] = $order_id; $this->database->insert( $this->table( 'commerce_order_items' ), $item ); }
			$this->database->query( 'COMMIT' ); return $this->order( (string) $order['uuid'] ) ?? array();
		} catch ( \Throwable $error ) { $this->database->query( 'ROLLBACK' ); throw $error; }
	}
	public function order( string $uuid ): ?array { $row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->table( 'commerce_orders' )} WHERE uuid=%s", $uuid ), ARRAY_A ); if ( ! is_array( $row ) ) return null; $row['items'] = $this->database->get_results( $this->database->prepare( "SELECT * FROM {$this->table( 'commerce_order_items' )} WHERE order_id=%d", $row['id'] ), ARRAY_A ) ?: array(); return $row; }
	public function begin(): void { $this->database->query( 'START TRANSACTION' ); }
	public function commit(): void { $this->database->query( 'COMMIT' ); }
	public function rollback(): void { $this->database->query( 'ROLLBACK' ); }
	public function lock_order( string $uuid ): ?array { $row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$this->table( 'commerce_orders' )} WHERE uuid=%s FOR UPDATE", $uuid ), ARRAY_A ); if ( ! is_array( $row ) ) return null; $row['items'] = $this->database->get_results( $this->database->prepare( "SELECT * FROM {$this->table( 'commerce_order_items' )} WHERE order_id=%d", $row['id'] ), ARRAY_A ) ?: array(); return $row; }
	public function orders( ?int $user_id = null ): array { $where = null === $user_id ? '' : $this->database->prepare( ' WHERE user_id=%d', $user_id ); return $this->database->get_results( "SELECT * FROM {$this->table( 'commerce_orders' )}{$where} ORDER BY created_at DESC LIMIT 200", ARRAY_A ) ?: array(); }
	public function update_order( string $uuid, array $values ): ?array { $this->database->update( $this->table( 'commerce_orders' ), $values, array( 'uuid' => $uuid ) ); return $this->order( $uuid ); }
	public function reduce_stock( int $product_id, int $quantity ): bool { return 1 === (int) $this->database->query( $this->database->prepare( "UPDATE {$this->table( 'commerce_products' )} SET stock_quantity=IF(stock_quantity IS NULL,NULL,stock_quantity-%d) WHERE id=%d AND (stock_quantity IS NULL OR stock_quantity >= %d)", $quantity, $product_id, $quantity ) ); }
	public function grant( array $row ): void { $this->database->insert( $this->table( 'commerce_entitlements' ), $row ); }
	public function entitlements( int $user_id ): array { return $this->database->get_results( $this->database->prepare( "SELECT e.*,p.name AS product_name,p.product_type FROM {$this->table( 'commerce_entitlements' )} e JOIN {$this->table( 'commerce_products' )} p ON p.id=e.product_id WHERE e.user_id=%d ORDER BY e.created_at DESC", $user_id ), ARRAY_A ) ?: array(); }
	public function redeem_ticket( string $code ): ?array { $table = $this->table( 'commerce_entitlements' ); $now = gmdate( 'Y-m-d H:i:s' ); $updated = $this->database->query( $this->database->prepare( "UPDATE {$table} SET status='redeemed',redeemed_at=%s,updated_at=%s WHERE access_code=%s AND entitlement_type='ticket' AND status='active'", $now, $now, $code ) ); if ( 1 !== (int) $updated ) return null; $row = $this->database->get_row( $this->database->prepare( "SELECT * FROM {$table} WHERE access_code=%s", $code ), ARRAY_A ); return is_array( $row ) ? $row : null; }
	public function report(): array {
		$o = $this->table( 'commerce_orders' ); $p = $this->table( 'commerce_products' );
		return array( 'grossRevenueMinor' => (int) $this->database->get_var( "SELECT COALESCE(SUM(total_minor),0) FROM {$o} WHERE status IN ('paid','fulfilled')" ), 'paidOrders' => (int) $this->database->get_var( "SELECT COUNT(*) FROM {$o} WHERE status IN ('paid','fulfilled')" ), 'pendingOrders' => (int) $this->database->get_var( "SELECT COUNT(*) FROM {$o} WHERE status='pending'" ), 'activeProducts' => (int) $this->database->get_var( "SELECT COUNT(*) FROM {$p} WHERE status='active'" ) );
	}
}
