<?php
/**
 * Server-side OneSignal REST adapter.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Notifications;

use InstaScore\Platform\Support\Config;

final class OneSignalAdapter {
	/**
	 * @param array<int,string>    $external_user_ids Recipient WordPress UUIDs.
	 * @param array<string,mixed>  $payload Notification payload.
	 * @return array<string,mixed>
	 */
	public function send( array $external_user_ids, array $payload ): array {
		if ( Config::notifications_disabled() ) {
			return array( 'status' => 'disabled' );
		}

		$app_id = Config::onesignal_app_id();
		$key    = Config::onesignal_rest_api_key();
		if ( '' === $app_id || '' === $key ) {
			return array( 'status' => 'not_configured' );
		}

		$body = array(
			'app_id'                    => $app_id,
			'include_aliases'           => array( 'external_id' => array_values( array_unique( $external_user_ids ) ) ),
			'target_channel'            => 'push',
			'headings'                  => array( 'en' => (string) ( $payload['title'] ?? 'InstaScore' ) ),
			'contents'                  => array( 'en' => (string) ( $payload['body'] ?? '' ) ),
			'url'                       => (string) ( $payload['launchUrl'] ?? home_url( '/' ) ),
			'collapse_id'               => (string) ( $payload['collapseKey'] ?? '' ),
			'data'                      => array(
				'category'  => (string) ( $payload['category'] ?? '' ),
				'eventUuid' => (string) ( $payload['eventUuid'] ?? '' ),
			),
		);

		$response = wp_remote_post(
			'https://api.onesignal.com/notifications',
			array(
				'timeout' => 10,
				'headers' => array(
					'Authorization' => 'Key ' . $key,
					'Content-Type'  => 'application/json; charset=utf-8',
				),
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'status' => 'failed', 'error' => $response->get_error_message() );
		}

		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		return is_array( $data ) ? $data : array( 'status' => 'sent' );
	}
}
