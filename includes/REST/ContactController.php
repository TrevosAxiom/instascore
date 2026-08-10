<?php
/** Public contact form endpoint. @package InstaScore_Platform */
namespace InstaScore\Platform\REST;

use WP_REST_Request;
use WP_REST_Response;

final class ContactController {
	public function register(): void {
		register_rest_route( 'instascore/v1', '/contact', array(
			'methods' => 'POST', 'callback' => array( $this, 'send' ), 'permission_callback' => '__return_true',
		) );
	}
	public function send( WP_REST_Request $request ): WP_REST_Response {
		$input = $request->get_json_params();
		if ( ! empty( $input['website'] ) ) return Envelope::success( array( 'message' => 'Message received.' ) );
		$rate_key = 'instascore_contact_' . substr( hash( 'sha256', (string) ( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ) ), 0, 20 );
		$attempts = (int) get_transient( $rate_key );
		if ( $attempts >= 3 ) return Envelope::error( 'instascore_contact_rate_limit', 'Please wait a minute before sending another message.', array(), 429 );
		set_transient( $rate_key, $attempts + 1, MINUTE_IN_SECONDS );
		$name = sanitize_text_field( (string) ( $input['name'] ?? '' ) );
		$email = sanitize_email( (string) ( $input['email'] ?? '' ) );
		$subject = sanitize_text_field( (string) ( $input['subject'] ?? '' ) );
		$message = sanitize_textarea_field( (string) ( $input['message'] ?? '' ) );
		$fields = array();
		if ( ! $name ) $fields['name'] = 'Name is required.';
		if ( ! is_email( $email ) ) $fields['email'] = 'Enter a valid email address.';
		if ( ! $subject ) $fields['subject'] = 'Subject is required.';
		if ( strlen( $message ) < 10 ) $fields['message'] = 'Please provide a little more detail.';
		if ( $fields ) return Envelope::error( 'instascore_contact_validation', 'Check the contact form.', $fields, 422 );
		$address = sanitize_email( (string) get_option( 'admin_email' ) );
		$sent = wp_mail( $address, '[InstaScore] ' . $subject, "From: {$name} <{$email}>\n\n{$message}", array( 'Reply-To: ' . $email ) );
		return $sent ? Envelope::success( array( 'message' => 'Thanks—your message has been sent.' ) ) : Envelope::error( 'instascore_contact_delivery', 'The message could not be sent right now. Please try again.', array(), 503 );
	}
}
