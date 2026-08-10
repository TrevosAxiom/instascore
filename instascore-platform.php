<?php
/**
 * Plugin Name: InstaScore Platform
 * Description: Backend and application host for the InstaScore sports platform.
 * Version: 0.18.3
 * Requires at least: 6.6
 * Requires PHP: 8.2
 * Author: InstaScore
 * Update URI: https://github.com/TrevosAxiom/instascore
 * Text Domain: instascore-platform
 *
 * @package InstaScore_Platform
 */

defined( 'ABSPATH' ) || exit;

define( 'INSTASCORE_PLATFORM_VERSION', '0.18.3' );
define( 'INSTASCORE_DB_VERSION', 15 );
define( 'INSTASCORE_PLATFORM_FILE', __FILE__ );
define( 'INSTASCORE_PLATFORM_PATH', plugin_dir_path( __FILE__ ) );
define( 'INSTASCORE_PLATFORM_URL', plugin_dir_url( __FILE__ ) );

require_once INSTASCORE_PLATFORM_PATH . 'includes/autoload.php';

register_activation_hook(
	INSTASCORE_PLATFORM_FILE,
	array( \InstaScore\Platform\Activation::class, 'activate' )
);
register_deactivation_hook(
	INSTASCORE_PLATFORM_FILE,
	array( \InstaScore\Platform\Deactivation::class, 'deactivate' )
);

\InstaScore\Platform\Bootstrap::instance()->register();
