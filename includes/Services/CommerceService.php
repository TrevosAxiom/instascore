<?php
/** Server-priced commerce workflows for subscriptions, tickets and merchandise. @package InstaScore_Platform */

namespace InstaScore\Platform\Services;

use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\CommerceRepository;

final class CommerceService {
	public function __construct( private readonly CommerceRepository $repository ) {}
	public static function create(): self { global $wpdb; return new self( new CommerceRepository( $wpdb ) ); }
	public function catalogue( bool $admin = false ): array { return array_map( array( $this, 'present_product' ), $this->repository->products( $admin ) ); }
	public function save_product( array $input, ?string $uuid = null ): array {
		$type = sanitize_key( (string) ( $input['productType'] ?? '' ) ); $name = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		if ( ! in_array( $type, array( 'subscription', 'ticket', 'merchandise' ), true ) || '' === $name ) throw new ValidationException( array( 'product' => 'A valid type and name are required.' ) );
		$row = array(
			'product_type' => $type, 'name' => $name, 'slug' => sanitize_title( (string) ( $input['slug'] ?? $name ) ),
			'description' => sanitize_textarea_field( (string) ( $input['description'] ?? '' ) ), 'image_url' => esc_url_raw( (string) ( $input['imageUrl'] ?? '' ) ),
			'price_minor' => max( 0, (int) ( $input['priceMinor'] ?? 0 ) ), 'currency' => substr( strtoupper( sanitize_text_field( (string) ( $input['currency'] ?? 'NGN' ) ) ), 0, 3 ),
			'stock_quantity' => isset( $input['stockQuantity'] ) && '' !== $input['stockQuantity'] ? max( 0, (int) $input['stockQuantity'] ) : null,
			'fixture_id' => ! empty( $input['fixtureId'] ) ? (int) $input['fixtureId'] : null, 'billing_period' => 'subscription' === $type ? sanitize_key( (string) ( $input['billingPeriod'] ?? 'monthly' ) ) : null,
			'status' => in_array( ( $input['status'] ?? '' ), array( 'draft', 'active', 'archived' ), true ) ? $input['status'] : 'draft',
			'metadata_json' => wp_json_encode( array( 'fulfilment' => sanitize_key( (string) ( $input['fulfilment'] ?? ( 'merchandise' === $type ? 'delivery' : 'digital' ) ) ) ) ),
		);
		return $this->present_product( $this->repository->save_product( $row, $uuid ) );
	}
	public function checkout( array $input, int $user_id ): array {
		$lines = is_array( $input['items'] ?? null ) ? $input['items'] : array(); if ( 0 === $user_id || array() === $lines ) throw new ValidationException( array( 'items' => 'Sign in and select at least one item.' ) );
		$items = array(); $total = 0; $currency = ''; $requires_delivery = false;
		foreach ( $lines as $line ) { $product = $this->repository->product( sanitize_text_field( (string) ( $line['productUuid'] ?? '' ) ) ); $quantity = max( 1, min( 10, (int) ( $line['quantity'] ?? 1 ) ) ); if ( null === $product || 'active' !== $product['status'] ) throw new ValidationException( array( 'items' => 'One product is no longer available.' ) ); if ( null !== $product['stock_quantity'] && (int) $product['stock_quantity'] < $quantity ) throw new ValidationException( array( 'stock' => $product['name'] . ' does not have enough stock.' ) ); if ( '' !== $currency && $currency !== $product['currency'] ) throw new ValidationException( array( 'currency' => 'One order cannot mix currencies.' ) ); $requires_delivery = $requires_delivery || 'merchandise' === $product['product_type']; $currency = $product['currency']; $line_total = (int) $product['price_minor'] * $quantity; $total += $line_total; $items[] = array( 'product_id' => (int) $product['id'], 'product_name' => $product['name'], 'product_type' => $product['product_type'], 'quantity' => $quantity, 'unit_price_minor' => (int) $product['price_minor'], 'total_minor' => $line_total, 'metadata_json' => '{}' ); }
		if ( $requires_delivery && '' === trim( (string) ( $input['deliveryAddress'] ?? '' ) ) ) throw new ValidationException( array( 'deliveryAddress' => 'A delivery address is required for merchandise.' ) );
		$uuid = wp_generate_uuid4(); $now = gmdate( 'Y-m-d H:i:s' ); $order = array( 'uuid' => $uuid, 'order_number' => 'IS-' . gmdate( 'ymd' ) . '-' . strtoupper( substr( str_replace( '-', '', $uuid ), 0, 8 ) ), 'user_id' => $user_id, 'status' => 'pending', 'payment_method' => sanitize_key( (string) ( $input['paymentMethod'] ?? 'manual' ) ), 'payment_reference' => null, 'subtotal_minor' => $total, 'total_minor' => $total, 'currency' => $currency ?: 'NGN', 'customer_json' => wp_json_encode( array( 'name' => sanitize_text_field( (string) ( $input['customerName'] ?? '' ) ), 'email' => sanitize_email( (string) ( $input['customerEmail'] ?? '' ) ), 'address' => sanitize_textarea_field( (string) ( $input['deliveryAddress'] ?? '' ) ) ) ), 'notes' => '', 'created_at' => $now, 'paid_at' => null, 'fulfilled_at' => null, 'updated_at' => $now );
		return $this->present_order( $this->repository->create_order( $order, $items ) );
	}
	public function settle( string $uuid, array $input ): array {
		$this->repository->begin();
		try {
			$order = $this->repository->lock_order( $uuid ); if ( null === $order ) throw new ValidationException( array( 'order' => 'Order not found.' ) ); if ( 'pending' !== $order['status'] ) { $this->repository->commit(); return $this->present_order( $order ); }
			foreach ( $order['items'] as $item ) if ( ! $this->repository->reduce_stock( (int) $item['product_id'], (int) $item['quantity'] ) ) throw new ValidationException( array( 'stock' => $item['product_name'] . ' cannot be fulfilled.' ) );
			$now = gmdate( 'Y-m-d H:i:s' ); $order = $this->repository->update_order( $uuid, array( 'status' => 'paid', 'payment_reference' => sanitize_text_field( (string) ( $input['paymentReference'] ?? 'manual-' . time() ) ), 'paid_at' => $now, 'updated_at' => $now ) );
			foreach ( $order['items'] as $item ) for ( $i = 0; $i < (int) $item['quantity']; $i++ ) { $product = $this->repository->product_by_id( (int) $item['product_id'] ); $period = 'annual' === ( $product['billing_period'] ?? '' ) ? '+1 year' : '+1 month'; $ends = 'subscription' === $item['product_type'] ? gmdate( 'Y-m-d H:i:s', strtotime( $period ) ) : null; $this->repository->grant( array( 'uuid' => wp_generate_uuid4(), 'user_id' => (int) $order['user_id'], 'order_id' => (int) $order['id'], 'product_id' => (int) $item['product_id'], 'entitlement_type' => $item['product_type'], 'access_code' => 'ticket' === $item['product_type'] ? strtoupper( bin2hex( random_bytes( 8 ) ) ) : null, 'status' => 'active', 'starts_at' => $now, 'ends_at' => $ends, 'redeemed_at' => null, 'metadata_json' => '{}', 'created_at' => $now, 'updated_at' => $now ) ); }
			$this->repository->commit(); return $this->present_order( $order );
		} catch ( \Throwable $error ) { $this->repository->rollback(); throw $error; }
	}
	public function orders( ?int $user_id = null ): array { return array_map( array( $this, 'present_order' ), $this->repository->orders( $user_id ) ); }
	public function entitlements( int $user_id ): array { return array_map( fn( array $r ): array => array( 'uuid' => $r['uuid'], 'type' => $r['entitlement_type'], 'productName' => $r['product_name'], 'accessCode' => $r['access_code'], 'status' => $r['status'], 'startsAt' => $r['starts_at'], 'endsAt' => $r['ends_at'], 'redeemedAt' => $r['redeemed_at'] ), $this->repository->entitlements( $user_id ) ); }
	public function report(): array { return $this->repository->report(); }
	public function redeem_ticket( string $code ): array { $code = strtoupper( preg_replace( '/[^A-Z0-9]/', '', $code ) ?? '' ); if ( '' === $code ) throw new ValidationException( array( 'accessCode' => 'Enter a ticket code.' ) ); $ticket = $this->repository->redeem_ticket( $code ); if ( null === $ticket ) throw new ValidationException( array( 'accessCode' => 'Ticket is invalid or has already been redeemed.' ) ); return array( 'status' => 'redeemed', 'accessCode' => $code, 'redeemedAt' => $ticket['redeemed_at'] ); }
	public function fulfil( string $uuid ): array { $order = $this->repository->order( $uuid ); if ( null === $order || ! in_array( $order['status'], array( 'paid', 'fulfilled' ), true ) ) throw new ValidationException( array( 'order' => 'Only paid orders can be fulfilled.' ) ); if ( 'fulfilled' !== $order['status'] ) $order = $this->repository->update_order( $uuid, array( 'status' => 'fulfilled', 'fulfilled_at' => gmdate( 'Y-m-d H:i:s' ), 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ) ); return $this->present_order( $order ); }
	private function present_product( array $r ): array { return array( 'uuid' => $r['uuid'], 'productType' => $r['product_type'], 'name' => $r['name'], 'slug' => $r['slug'], 'description' => $r['description'], 'imageUrl' => $r['image_url'], 'priceMinor' => (int) $r['price_minor'], 'currency' => $r['currency'], 'stockQuantity' => null === $r['stock_quantity'] ? null : (int) $r['stock_quantity'], 'fixtureId' => null === $r['fixture_id'] ? null : (int) $r['fixture_id'], 'billingPeriod' => $r['billing_period'], 'status' => $r['status'] ); }
	private function present_order( array $r ): array { return array( 'uuid' => $r['uuid'], 'orderNumber' => $r['order_number'], 'status' => $r['status'], 'totalMinor' => (int) $r['total_minor'], 'currency' => $r['currency'], 'paymentMethod' => $r['payment_method'], 'paymentReference' => $r['payment_reference'], 'createdAt' => $r['created_at'], 'paidAt' => $r['paid_at'], 'items' => array_map( fn( array $i ): array => array( 'name' => $i['product_name'], 'type' => $i['product_type'], 'quantity' => (int) $i['quantity'], 'unitPriceMinor' => (int) $i['unit_price_minor'], 'totalMinor' => (int) $i['total_minor'] ), $r['items'] ?? array() ) ); }
}
