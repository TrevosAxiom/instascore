<?php
/**
 * Protected image upload endpoint for InstaScore entities.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\REST;

use WP_REST_Request;
use WP_REST_Response;

final class AdminMediaController {
	public function register(): void {
		register_rest_route(
			'instascore/v1',
			'/admin/media',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'upload' ),
				'permission_callback' => static fn(): bool => current_user_can( 'upload_files' ) && (
					current_user_can( 'instascore_manage_competitions' ) ||
					current_user_can( 'instascore_manage_teams' ) ||
					current_user_can( 'instascore_manage_players' )
				),
			)
		);
	}

	public function upload( WP_REST_Request $request ): WP_REST_Response {
		$files = $request->get_file_params();
		if ( ! isset( $files['file'] ) || ! is_array( $files['file'] ) ) {
			return Envelope::error( 'instascore_media_missing', 'Choose an image to upload.', array(), 422 );
		}

		$file = $files['file'];
		if ( (int) ( $file['size'] ?? 0 ) > 2097152 ) {
			return Envelope::error( 'instascore_media_too_large', 'Images must be 2 MB or smaller.', array(), 422 );
		}
		$allowed = array( 'image/jpeg', 'image/png', 'image/webp' );
		if ( ! in_array( (string) ( $file['type'] ?? '' ), $allowed, true ) ) {
			return Envelope::error( 'instascore_media_type', 'Use a JPEG, PNG or WebP image.', array(), 422 );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$attachment_id = media_handle_upload( 'file', 0 );
		if ( is_wp_error( $attachment_id ) ) {
			return Envelope::error( 'instascore_media_upload_failed', $attachment_id->get_error_message(), array(), 422 );
		}
		$url = wp_get_attachment_url( $attachment_id );
		return Envelope::success(
			array(
				'attachmentId' => (int) $attachment_id,
				'url'          => is_string( $url ) ? $url : '',
				'mimeType'     => get_post_mime_type( $attachment_id ) ?: (string) $file['type'],
				'sizeBytes'    => (int) $file['size'],
			),
			array(),
			201
		);
	}
}
