<?php
/**
 * REST response envelope.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use WP_REST_Response;

final class Envelope {
	/**
	 * Create a successful REST response.
	 *
	 * @param mixed               $data Response data.
	 * @param array<string,mixed> $meta Response metadata.
	 * @param int                 $status HTTP status code.
	 */
	public static function success( mixed $data, array $meta = array(), int $status = 200 ): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'data'   => $data,
				'meta'   => (object) $meta,
				'errors' => array(),
			),
			$status
		);
	}

	/**
	 * Create a structured error response.
	 *
	 * @param string               $code Error code.
	 * @param string               $message Message.
	 * @param array<string,string> $fields Field errors.
	 * @param int                  $status HTTP status.
	 */
	public static function error( string $code, string $message, array $fields = array(), int $status = 400 ): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'data'   => null,
				'meta'   => (object) array(),
				'errors' => array(
					array(
						'code'    => $code,
						'message' => $message,
						'fields'  => (object) $fields,
					),
				),
			),
			$status
		);
	}
}
