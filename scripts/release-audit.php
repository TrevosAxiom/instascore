<?php
/** Deterministic local release-candidate audit. */

$root = dirname( __DIR__ );
$errors = array();
$plugin = (string) file_get_contents( $root . '/instascore-platform.php' );
$package = json_decode( (string) file_get_contents( $root . '/package.json' ), true );
$readme = (string) file_get_contents( $root . '/readme.txt' );

preg_match( '/^ \* Version: (.+)$/m', $plugin, $header );
preg_match( "/define\( 'INSTASCORE_PLATFORM_VERSION', '([^']+)' \);/", $plugin, $constant );
preg_match( "/define\( 'INSTASCORE_DB_VERSION', (\d+) \);/", $plugin, $database );
preg_match( '/^Stable tag: (.+)$/m', $readme, $stable );
$versions = array( $header[1] ?? '', $constant[1] ?? '', $package['version'] ?? '', $stable[1] ?? '' );
if ( 1 !== count( array_unique( $versions ) ) || '' === $versions[0] ) $errors[] = 'Plugin, constant, package and readme versions must match.';
if ( ! preg_match( '/^\d+\.\d+\.\d+(?:-rc\.\d+)?$/', $versions[0] ) ) $errors[] = 'Version is not a supported stable or release-candidate version.';

$migration = $root . '/includes/Database/Version' . str_pad( (string) ( $database[1] ?? '' ), 4, '0', STR_PAD_LEFT ) . '.php';
if ( ! is_file( $migration ) ) $errors[] = 'The declared database migration does not exist.';

$manifest_file = $root . '/dist/.vite/manifest.json';
$manifest = is_file( $manifest_file ) ? json_decode( (string) file_get_contents( $manifest_file ), true ) : null;
if ( ! is_array( $manifest ) || ! isset( $manifest['src/main.tsx']['file'] ) ) $errors[] = 'The production Vite manifest or main entry is missing.';
foreach ( is_array( $manifest ) ? $manifest : array() as $entry ) {
	if ( isset( $entry['file'] ) && ! is_file( $root . '/dist/' . $entry['file'] ) ) $errors[] = 'Manifest references a missing asset: ' . $entry['file'];
}
$asset_bytes = 0;
foreach ( glob( $root . '/dist/assets/*.{js,css}', GLOB_BRACE ) ?: array() as $asset ) $asset_bytes += filesize( $asset );
if ( 0 === $asset_bytes || $asset_bytes > 2 * 1024 * 1024 ) $errors[] = 'Compiled JavaScript and CSS exceed the 2 MB production budget or are missing.';

foreach ( array( '.env', '.DS_Store', 'error_log', 'wp-config.php' ) as $forbidden ) if ( file_exists( $root . '/' . $forbidden ) ) $errors[] = 'Forbidden release file exists: ' . $forbidden;
if ( ! is_file( $root . '/dist/sw.js' ) ) $errors[] = 'The compiled PWA service worker is missing.';

if ( $errors ) {
	fwrite( STDERR, "Release audit failed:\n- " . implode( "\n- ", array_unique( $errors ) ) . "\n" );
	exit( 1 );
}
echo 'Release audit passed for ' . $versions[0] . ' (DB ' . ( $database[1] ?? '?' ) . ', assets ' . number_format( $asset_bytes / 1024, 1 ) . " KiB).\n";
