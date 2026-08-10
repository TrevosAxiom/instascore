<?php
/**
 * Append-only audit repository.
 *
 * @package InstaScore_Platform
 */
namespace InstaScore\Platform\Repositories;

use RuntimeException;
use wpdb;

final class AuditRepository {
	public function __construct( private readonly wpdb $database ) {}

	/**
	 * @param array<string,mixed>|null $before Before.
	 * @param array<string,mixed>|null $after After.
	 */
	public function record( string $entity_type, string $entity_uuid, string $action, ?array $before, ?array $after ): void {
		$ip_source      = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$request_source = isset( $_SERVER['HTTP_X_REQUEST_ID'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_REQUEST_ID'] ) ) : wp_generate_uuid4();
		$ip             = sanitize_text_field( (string) $ip_source );
		$request        = sanitize_text_field( (string) $request_source );
		$result         = $this->database->insert(
			$this->database->prefix . 'instascore_audit_logs',
			array(
				'uuid'          => wp_generate_uuid4(),
				'entity_type'   => $entity_type,
				'entity_uuid'   => $entity_uuid,
				'action'        => $action,
				'actor_user_id' => 0 === get_current_user_id() ? null : get_current_user_id(),
				'request_uuid'  => wp_is_uuid( $request ) ? $request : wp_generate_uuid4(),
				'before_json'   => null === $before ? null : wp_json_encode( $before ),
				'after_json'    => null === $after ? null : wp_json_encode( $after ),
				'ip_hash'       => '' === $ip ? null : hash_hmac( 'sha256', $ip, wp_salt( 'auth' ) ),
				'created_at'    => gmdate( 'Y-m-d H:i:s' ),
			)
		);
		if ( false === $result ) {
			throw new RuntimeException( 'Unable to record the mutation audit trail.' );
		}
	}
}
