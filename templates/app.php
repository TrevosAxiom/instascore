<?php
/**
 * Standalone InstaScore application template.
 *
 * @package InstaScore_Platform
 */

use InstaScore\Platform\Support\Shortcode;

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
	<?php wp_head(); ?>
</head>
<body class="instascore-standalone">
<?php wp_body_open(); ?>
<?php echo Shortcode::render(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Shortcode renderer escapes bootstrap JSON and emits the app mount. ?>
<?php wp_footer(); ?>
</body>
</html>
