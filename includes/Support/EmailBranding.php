<?php
/**
 * Branded HTML treatment for all WordPress email.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

final class EmailBranding {
	public static function register(): void {
		add_filter( 'wp_mail', array( self::class, 'brand_mail' ), 20 );
		add_filter( 'wp_mail_from_name', static fn(): string => 'InstaScore' );
	}

	/** @param array<string,mixed> $mail */
	public static function brand_mail( array $mail ): array {
		$subject = sanitize_text_field( (string) ( $mail['subject'] ?? 'InstaScore update' ) );
		if ( ! str_contains( strtolower( $subject ), 'instascore' ) ) {
			$subject = '[InstaScore] ' . $subject;
		}
		$message = (string) ( $mail['message'] ?? '' );
		if ( ! str_contains( $message, 'data-instascore-email' ) ) {
			$message = self::template( $subject, self::content( $message ) );
		}
		$headers = $mail['headers'] ?? array();
		$headers = is_array( $headers ) ? $headers : preg_split( '/\r?\n/', (string) $headers );
		$headers = array_values( array_filter( $headers, static fn( string $header ): bool => ! str_starts_with( strtolower( $header ), 'content-type:' ) ) );
		$headers[] = 'Content-Type: text/html; charset=UTF-8';

		$mail['subject'] = $subject;
		$mail['message'] = $message;
		$mail['headers'] = $headers;
		return $mail;
	}

	public static function template( string $title, string $content ): string {
		$logo = esc_url( INSTASCORE_PLATFORM_URL . 'public/icons/icon-192.png' );
		$home = esc_url( home_url( '/' ) );
		return '<!doctype html><html><body data-instascore-email="1" style="margin:0;background:#f5f3ed;color:#07192d;font-family:Arial,Helvetica,sans-serif">'
			. '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ed;padding:32px 12px"><tr><td align="center">'
			. '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e3ddca;border-radius:18px;overflow:hidden">'
			. '<tr><td style="padding:22px 28px;background:#07192d;border-bottom:4px solid #f3c643"><a href="' . $home . '" style="text-decoration:none;color:#fff5d6"><img src="' . $logo . '" width="46" height="46" alt="InstaScore" style="display:inline-block;vertical-align:middle;border-radius:12px"><strong style="display:inline-block;margin-left:12px;vertical-align:middle;font-size:22px">InstaScore</strong></a></td></tr>'
			. '<tr><td style="padding:32px 28px"><div style="color:#c59609;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Match day starts here</div><h1 style="margin:8px 0 18px;color:#07192d;font-size:28px;line-height:1.15">' . esc_html( $title ) . '</h1><div style="color:#38506a;font-size:16px;line-height:1.65">' . $content . '</div></td></tr>'
			. '<tr><td style="padding:20px 28px;background:#eef2f5;color:#63758a;font-size:12px;line-height:1.5">This message was sent by InstaScore.<br><strong style="color:#07192d">Powered by Lagos Wolverines</strong></td></tr>'
			. '</table></td></tr></table></body></html>';
	}

	private static function content( string $message ): string {
		if ( preg_match( '/<(?:p|div|a|table|h[1-6]|ul|ol|li|br|strong|em|span)\b/i', $message ) ) {
			return wp_kses_post( $message );
		}
		$message = preg_replace( '/[<>]/', '', $message ) ?? $message;
		return make_clickable( nl2br( esc_html( trim( $message ) ) ) );
	}
}
