<?php
/**
 * PHPUnit bootstrap.
 *
 * @package InstaScore_Platform
 */

$plugin_root = dirname( __DIR__, 2 );

require_once $plugin_root . '/vendor/autoload.php';
require_once __DIR__ . '/WordPressStub.php';

defined( 'ABSPATH' ) || define( 'ABSPATH', dirname( $plugin_root, 4 ) . '/' );
defined( 'INSTASCORE_PLATFORM_PATH' ) || define( 'INSTASCORE_PLATFORM_PATH', $plugin_root . '/' );
defined( 'INSTASCORE_PLATFORM_VERSION' ) || define( 'INSTASCORE_PLATFORM_VERSION', '0.1.0' );
defined( 'INSTASCORE_DB_VERSION' ) || define( 'INSTASCORE_DB_VERSION', 3 );

require_once $plugin_root . '/includes/autoload.php';
