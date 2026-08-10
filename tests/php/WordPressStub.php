<?php
/**
 * Minimal WordPress test doubles for isolated unit tests.
 *
 * @package InstaScore_Platform
 */

$GLOBALS['instascore_test_actions'] = array();
$GLOBALS['instascore_test_options'] = array( 'instascore_db_version' => 15 );
$GLOBALS['instascore_test_capabilities'] = array();
$GLOBALS['instascore_test_user_meta'] = array();
$GLOBALS['instascore_test_site_transients'] = array();

defined( 'ARRAY_A' ) || define( 'ARRAY_A', 'ARRAY_A' );

class WP_REST_Request implements ArrayAccess {
    public function __construct( private array $params = array(), private array $json = array(), private array $headers = array() ) {}
    public function get_param( string $key ): mixed { return $this->params[ $key ] ?? null; }
    public function get_json_params(): array { return $this->json; }
    public function get_header( string $key ): string { return $this->headers[ $key ] ?? ''; }
    public function offsetExists( mixed $offset ): bool { return isset( $this->params[ $offset ] ); }
    public function offsetGet( mixed $offset ): mixed { return $this->params[ $offset ] ?? null; }
    public function offsetSet( mixed $offset, mixed $value ): void { $this->params[ $offset ] = $value; }
    public function offsetUnset( mixed $offset ): void { unset( $this->params[ $offset ] ); }
}

class WP_REST_Response {
    public function __construct(
        private readonly mixed $data,
        private readonly int $status = 200
    ) {}

    public function get_data(): mixed {
        return $this->data;
    }

    public function get_status(): int {
        return $this->status;
    }
    public function header( string $key, string $value ): void {}
}

class wpdb {
    public string $prefix = 'wp_';
    public int $insert_id = 1;
    public array $rows = array();
    public function get_charset_collate(): string { return 'DEFAULT CHARACTER SET utf8mb4'; }
    public function prepare( string $sql, mixed ...$args ): string {
        if ( count( $args ) === 1 && is_array( $args[0] ) ) { $args = $args[0]; }
        foreach ( $args as $arg ) {
            $sql = preg_replace( '/%[ds]/', is_int( $arg ) ? (string) $arg : "'" . addslashes( (string) $arg ) . "'", $sql, 1 );
        }
        return $sql;
    }
    public function insert( string $table, array $data ): int|false { $this->rows[ $table ][ $data['uuid'] ?? count( $this->rows ) ] = array_merge( array( 'id' => $this->insert_id++ ), $data ); return 1; }
    public function update( string $table, array $data, array $where ): int|false { $this->rows[ $table ][ $where['uuid'] ] = array_merge( $this->rows[ $table ][ $where['uuid'] ] ?? array(), $data ); return 1; }
    public function delete( string $table, array $where ): int|false { foreach ( $this->rows[ $table ] ?? array() as $key => $row ) { $match = true; foreach ( $where as $field => $value ) { if ( (string) ( $row[ $field ] ?? '' ) !== (string) $value ) { $match = false; } } if ( $match ) { unset( $this->rows[ $table ][ $key ] ); } } return 1; }
    public function get_row( string $sql, string $format = ARRAY_A ): ?array {
        if ( preg_match( "/WHERE id = ([0-9]+)/", $sql, $id_match ) ) {
            foreach ( $this->rows as $rows ) { foreach ( $rows as $row ) { if ( (int) ( $row['id'] ?? 0 ) === (int) $id_match[1] ) return $row; } }
        }
        if ( str_contains( $sql, 'team_registrations' ) && preg_match( "/player_id = ([0-9]+).*season_id = ([0-9]+).*status = 'active'/", $sql, $match ) ) {
            foreach ( $this->rows['wp_instascore_team_registrations'] ?? array() as $row ) {
                if ( (int) $row['player_id'] === (int) $match[1] && (int) $row['season_id'] === (int) $match[2] && 'active' === $row['status'] ) return $row;
            }
        }
        if ( str_contains( $sql, 'team_registrations' ) && preg_match( "/team_id = ([0-9]+).*season_id = ([0-9]+).*jersey_number = ([0-9]+).*status = 'active'/", $sql, $match ) ) {
            foreach ( $this->rows['wp_instascore_team_registrations'] ?? array() as $row ) {
                if ( (int) $row['team_id'] === (int) $match[1] && (int) $row['season_id'] === (int) $match[2] && (int) $row['jersey_number'] === (int) $match[3] && 'active' === $row['status'] ) return $row;
            }
        }
        preg_match( "/uuid = '([^']+)'/", $sql, $match );
        foreach ( $this->rows as $rows ) { if ( isset( $rows[ $match[1] ?? '' ] ) ) return $rows[ $match[1] ]; }
        return null;
    }
    public function get_results( string $sql, string $format = ARRAY_A ): array { return array(); }
    public function get_var( string $sql ): int { return 0; }
    public function query( string $sql ): int { return 1; }
    public function esc_like( string $value ): string { return addcslashes( $value, '_%' ); }
}

function add_action( string $hook, callable|array|string $callback, int $priority = 10 ): void {
    $GLOBALS['instascore_test_actions'][ $hook ][] = array( $callback, $priority );
}

function add_filter( string $hook, callable|array|string $callback, int $priority = 10, int $accepted_args = 1 ): void {
    $GLOBALS['instascore_test_actions'][ $hook ][] = array( $callback, $priority, $accepted_args );
}

function get_option( string $key, mixed $default = false ): mixed {
    return $GLOBALS['instascore_test_options'][ $key ] ?? $default;
}
function update_option( string $key, mixed $value, bool $autoload = false ): bool {
    $GLOBALS['instascore_test_options'][ $key ] = $value;
    return true;
}
function get_site_transient( string $key ): mixed { return $GLOBALS['instascore_test_site_transients'][ $key ] ?? false; }
function set_site_transient( string $key, mixed $value, int $expiration = 0 ): bool { $GLOBALS['instascore_test_site_transients'][ $key ] = $value; return true; }
function plugin_basename( string $file ): string { return 'instascore-platform/' . basename( $file ); }

function sanitize_text_field( string $value ): string { return trim( strip_tags( $value ) ); }
function wp_unslash( string $value ): string { return stripslashes( $value ); }
function sanitize_textarea_field( string $value ): string { return trim( strip_tags( $value ) ); }
function sanitize_email( string $value ): string { return filter_var( trim( $value ), FILTER_SANITIZE_EMAIL ); }
function sanitize_key( string $value ): string { return strtolower( preg_replace( '/[^a-z0-9_-]/', '', $value ) ); }
function sanitize_title( string $value ): string { return trim( strtolower( preg_replace( '/[^a-z0-9]+/i', '-', $value ) ), '-' ); }
function esc_url_raw( string $value ): string { return filter_var( trim( $value ), FILTER_SANITIZE_URL ); }
function wp_http_validate_url( string $value ): string|false { return filter_var( $value, FILTER_VALIDATE_URL ); }
function untrailingslashit( string $value ): string { return rtrim( $value, '/\\' ); }
function wp_is_uuid( string $value ): bool { return 1 === preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value ); }
function current_user_can( string $capability ): bool { return in_array( $capability, $GLOBALS['instascore_test_capabilities'], true ); }
function get_current_user_id(): int { return 7; }
function get_user_meta( int $user_id, string $key, bool $single = false ): mixed { return $GLOBALS['instascore_test_user_meta'][ $user_id ][ $key ] ?? array(); }
function wp_generate_uuid4(): string { static $id = 1; return sprintf( '00000000-0000-4000-8000-%012d', $id++ ); }
function wp_json_encode( mixed $value ): string { return json_encode( $value, JSON_THROW_ON_ERROR ); }
function wp_salt( string $scheme ): string { return 'test-salt'; }
function do_action( string $hook, mixed ...$args ): void {}
