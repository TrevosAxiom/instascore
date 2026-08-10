<?php
/**
 * WordPress backend settings page.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Support;

use InstaScore\Platform\Services\OperationsService;

final class AdminSettings {
	private const CAPABILITY = 'instascore_access_admin';
	private const PAGE_SLUG  = 'instascore-platform-settings';

	public static function register_menu(): void {
		add_menu_page(
			__( 'InstaScore', 'instascore-platform' ),
			__( 'InstaScore', 'instascore-platform' ),
			self::CAPABILITY,
			self::PAGE_SLUG,
			array( self::class, 'render' ),
			'dashicons-awards',
			58
		);

		add_submenu_page(
			self::PAGE_SLUG,
			__( 'InstaScore Settings', 'instascore-platform' ),
			__( 'Settings', 'instascore-platform' ),
			self::CAPABILITY,
			self::PAGE_SLUG,
			array( self::class, 'render' )
		);
	}

	public static function save_settings(): void {
		self::guard( 'instascore_save_settings' );

		$input = self::settings_from_post();
		OperationsService::create()->update_settings( $input, get_current_user_id() );
		self::redirect_with_notice( 'updated', __( 'InstaScore settings saved.', 'instascore-platform' ) );
	}

	public static function run_operation(): void {
		self::guard( 'instascore_run_operation' );

		$action = sanitize_key( (string) ( $_POST['operation'] ?? '' ) );
		$result = OperationsService::create()->action(
			$action,
			array( 'source' => 'wp_admin_settings' ),
			get_current_user_id()
		);

		$status  = 'failed' === ( $result['status'] ?? '' ) || 'rejected' === ( $result['status'] ?? '' ) ? 'error' : 'updated';
		$message = (string) ( $result['message'] ?? __( 'Operation completed.', 'instascore-platform' ) );
		self::redirect_with_notice( $status, $message );
	}

	public static function render(): void {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to manage InstaScore.', 'instascore-platform' ) );
		}

		$dashboard  = OperationsService::create()->dashboard();
		$settings   = $dashboard['settings'];
		$providers  = $settings['providerSettings'];
		$one_signal = $settings['oneSignalSettings'];
		$summary    = $dashboard['summary'];
		$notice     = self::current_notice();

		?>
		<div class="wrap instascore-admin-settings">
			<h1><?php esc_html_e( 'InstaScore Settings', 'instascore-platform' ); ?></h1>
			<p><?php esc_html_e( 'Manage league bootstrap tools, provider polling, feature flags and operational safety controls from the WordPress backend.', 'instascore-platform' ); ?></p>

			<?php if ( $notice ) : ?>
				<div class="notice notice-<?php echo esc_attr( $notice['type'] ); ?> is-dismissible">
					<p><?php echo esc_html( $notice['message'] ); ?></p>
				</div>
			<?php endif; ?>

			<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:18px 0;">
				<?php foreach ( $summary as $label => $value ) : ?>
					<div style="background:#fff;border:1px solid #dcdcde;padding:14px;">
						<strong style="display:block;font-size:20px;"><?php echo esc_html( (string) $value ); ?></strong>
						<span><?php echo esc_html( self::labelize( (string) $label ) ); ?></span>
					</div>
				<?php endforeach; ?>
			</div>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="instascore_save_settings" />
				<?php wp_nonce_field( 'instascore_save_settings' ); ?>

				<h2><?php esc_html_e( 'Platform controls', 'instascore-platform' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Maintenance mode', 'instascore-platform' ); ?></th>
						<td><label><input type="checkbox" name="maintenanceMode" value="1" <?php checked( ! empty( $settings['maintenanceMode'] ) ); ?> /> <?php esc_html_e( 'Temporarily restrict public app behaviour during maintenance.', 'instascore-platform' ); ?></label></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Emergency notification disable', 'instascore-platform' ); ?></th>
						<td><label><input type="checkbox" name="emergencyNotificationsDisabled" value="1" <?php checked( ! empty( $settings['emergencyNotificationsDisabled'] ) ); ?> /> <?php esc_html_e( 'Stop automated notification sends immediately.', 'instascore-platform' ); ?></label></td>
					</tr>
					<tr>
						<th scope="row"><label for="instascore-data-retention"><?php esc_html_e( 'Data retention days', 'instascore-platform' ); ?></label></th>
						<td><input id="instascore-data-retention" name="dataRetentionDays" type="number" min="30" max="2555" value="<?php echo esc_attr( (string) $settings['dataRetentionDays'] ); ?>" class="small-text" /></td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Feature flags', 'instascore-platform' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php foreach ( (array) $settings['featureFlags'] as $flag => $enabled ) : ?>
						<tr>
							<th scope="row"><?php echo esc_html( self::labelize( (string) $flag ) ); ?></th>
							<td>
								<input type="hidden" name="featureFlags[<?php echo esc_attr( (string) $flag ); ?>]" value="0" />
								<label><input type="checkbox" name="featureFlags[<?php echo esc_attr( (string) $flag ); ?>]" value="1" <?php checked( (bool) $enabled ); ?> /> <?php esc_html_e( 'Enabled', 'instascore-platform' ); ?></label>
							</td>
						</tr>
					<?php endforeach; ?>
				</table>

				<h2><?php esc_html_e( 'Provider APIs and polling', 'instascore-platform' ); ?></h2>
				<p><?php esc_html_e( 'Provider keys are saved server-side only. Saved keys are never displayed back in the browser.', 'instascore-platform' ); ?></p>
				<?php self::render_provider_fields( 'football', $providers['football'] ); ?>
				<?php self::render_provider_fields( 'basketball', $providers['basketball'] ); ?>

				<h2><?php esc_html_e( 'OneSignal push notifications', 'instascore-platform' ); ?></h2>
				<p><?php esc_html_e( 'Credentials are stored server-side and are never returned to the app or displayed after saving.', 'instascore-platform' ); ?></p>
				<?php if ( ! empty( $one_signal['environmentOverride'] ) ) : ?>
					<p><strong><?php esc_html_e( 'Environment constants are active and override saved settings.', 'instascore-platform' ); ?></strong></p>
				<?php endif; ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="instascore-onesignal-app-id"><?php esc_html_e( 'OneSignal App ID', 'instascore-platform' ); ?></label></th>
						<td>
							<input id="instascore-onesignal-app-id" name="oneSignalSettings[appId]" type="password" value="" class="regular-text" autocomplete="new-password" placeholder="<?php echo esc_attr( ! empty( $one_signal['appIdConfigured'] ) ? __( 'Leave blank to keep current App ID', 'instascore-platform' ) : __( 'Paste OneSignal App ID', 'instascore-platform' ) ); ?>" <?php disabled( ! empty( $one_signal['environmentOverride'] ) ); ?> />
							<label><input type="checkbox" name="oneSignalSettings[clearAppId]" value="1" <?php disabled( ! empty( $one_signal['environmentOverride'] ) ); ?> /> <?php esc_html_e( 'Clear saved App ID', 'instascore-platform' ); ?></label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="instascore-onesignal-rest-key"><?php esc_html_e( 'OneSignal REST API key', 'instascore-platform' ); ?></label></th>
						<td>
							<input id="instascore-onesignal-rest-key" name="oneSignalSettings[restApiKey]" type="password" value="" class="regular-text" autocomplete="new-password" placeholder="<?php echo esc_attr( ! empty( $one_signal['restKeyConfigured'] ) ? __( 'Leave blank to keep current REST key', 'instascore-platform' ) : __( 'Paste OneSignal REST API key', 'instascore-platform' ) ); ?>" <?php disabled( ! empty( $one_signal['environmentOverride'] ) ); ?> />
							<label><input type="checkbox" name="oneSignalSettings[clearRestApiKey]" value="1" <?php disabled( ! empty( $one_signal['environmentOverride'] ) ); ?> /> <?php esc_html_e( 'Clear saved REST API key', 'instascore-platform' ); ?></label>
						</td>
					</tr>
				</table>

				<?php submit_button( __( 'Save InstaScore settings', 'instascore-platform' ) ); ?>
			</form>

			<h2><?php esc_html_e( 'Actions', 'instascore-platform' ); ?></h2>
			<div style="display:flex;gap:12px;flex-wrap:wrap;">
				<?php self::render_action_button( 'bootstrap_cffl_lagos', __( 'Bootstrap CFFL Lagos', 'instascore-platform' ), 'primary' ); ?>
				<?php self::render_action_button( 'football_live_sync', __( 'Poll football live scores now', 'instascore-platform' ) ); ?>
				<?php self::render_action_button( 'basketball_live_sync', __( 'Poll basketball live scores now', 'instascore-platform' ) ); ?>
				<?php self::render_action_button( 'diagnostic_report', __( 'Generate diagnostic report', 'instascore-platform' ) ); ?>
			</div>
		</div>
		<?php
	}

	private static function render_provider_fields( string $sport, array $settings ): void {
		?>
		<h3><?php echo esc_html( 'API-' . ucfirst( $sport ) ); ?></h3>
		<p><?php esc_html_e( 'The official API-Sports endpoint is configured automatically.', 'instascore-platform' ); ?></p>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="instascore-<?php echo esc_attr( $sport ); ?>-api-key"><?php esc_html_e( 'API key', 'instascore-platform' ); ?></label></th>
				<td>
					<input id="instascore-<?php echo esc_attr( $sport ); ?>-api-key" name="providerSettings[<?php echo esc_attr( $sport ); ?>][apiKey]" type="password" value="" class="regular-text" autocomplete="new-password" placeholder="<?php echo esc_attr( ! empty( $settings['apiKeyConfigured'] ) ? __( 'Leave blank to keep current key', 'instascore-platform' ) : __( 'Paste provider key', 'instascore-platform' ) ); ?>" />
					<p class="description"><?php echo esc_html( ! empty( $settings['apiKeyConfigured'] ) ? __( 'A key is configured.', 'instascore-platform' ) : __( 'No key is configured yet.', 'instascore-platform' ) ); ?></p>
					<label><input type="checkbox" name="providerSettings[<?php echo esc_attr( $sport ); ?>][clearApiKey]" value="1" /> <?php esc_html_e( 'Clear saved API key', 'instascore-platform' ); ?></label>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="instascore-<?php echo esc_attr( $sport ); ?>-league-ids"><?php esc_html_e( 'League IDs', 'instascore-platform' ); ?></label></th>
				<td>
					<input id="instascore-<?php echo esc_attr( $sport ); ?>-league-ids" name="providerSettings[<?php echo esc_attr( $sport ); ?>][leagueIds]" type="text" value="<?php echo esc_attr( implode( ', ', (array) ( $settings['leagueIds'] ?? array() ) ) ); ?>" class="regular-text" placeholder="39, 140, 253" />
					<p class="description"><?php esc_html_e( 'Comma-separated provider league IDs used to scope scheduled and manual synchronization.', 'instascore-platform' ); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e( 'Polling', 'instascore-platform' ); ?></th>
				<td>
					<input type="hidden" name="providerSettings[<?php echo esc_attr( $sport ); ?>][pollingEnabled]" value="0" />
					<label><input type="checkbox" name="providerSettings[<?php echo esc_attr( $sport ); ?>][pollingEnabled]" value="1" <?php checked( ! empty( $settings['pollingEnabled'] ) ); ?> /> <?php esc_html_e( 'Poll live scores automatically', 'instascore-platform' ); ?></label>
					<label style="margin-left:16px;" for="instascore-<?php echo esc_attr( $sport ); ?>-interval"><?php esc_html_e( 'Interval seconds', 'instascore-platform' ); ?></label>
					<input id="instascore-<?php echo esc_attr( $sport ); ?>-interval" name="providerSettings[<?php echo esc_attr( $sport ); ?>][liveIntervalSeconds]" type="number" min="15" max="3600" value="<?php echo esc_attr( (string) ( $settings['liveIntervalSeconds'] ?? 60 ) ); ?>" class="small-text" />
				</td>
			</tr>
		</table>
		<?php
	}

	private static function render_action_button( string $operation, string $label, string $type = 'secondary' ): void {
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="instascore_run_operation" />
			<input type="hidden" name="operation" value="<?php echo esc_attr( $operation ); ?>" />
			<?php wp_nonce_field( 'instascore_run_operation' ); ?>
			<?php submit_button( $label, $type, 'submit', false ); ?>
		</form>
		<?php
	}

	private static function settings_from_post(): array {
		$post = wp_unslash( $_POST );
		return array(
			'maintenanceMode'                 => ! empty( $post['maintenanceMode'] ),
			'emergencyNotificationsDisabled' => ! empty( $post['emergencyNotificationsDisabled'] ),
			'dataRetentionDays'               => (int) ( $post['dataRetentionDays'] ?? 365 ),
			'featureFlags'                    => self::feature_flags_from_post( $post['featureFlags'] ?? array() ),
			'providerSettings'                => is_array( $post['providerSettings'] ?? null ) ? $post['providerSettings'] : array(),
			'oneSignalSettings'               => is_array( $post['oneSignalSettings'] ?? null ) ? $post['oneSignalSettings'] : array(),
		);
	}

	private static function feature_flags_from_post( mixed $flags ): array {
		if ( ! is_array( $flags ) ) {
			return array();
		}
		$clean = array();
		foreach ( $flags as $key => $value ) {
			$clean[ sanitize_key( (string) $key ) ] = rest_sanitize_boolean( $value );
		}
		return $clean;
	}

	private static function guard( string $nonce_action ): void {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to manage InstaScore.', 'instascore-platform' ) );
		}
		check_admin_referer( $nonce_action );
	}

	private static function redirect_with_notice( string $type, string $message ): void {
		$url = add_query_arg(
			array(
				'page'               => self::PAGE_SLUG,
				'instascore_notice'  => rawurlencode( $message ),
				'instascore_status'  => 'error' === $type ? 'error' : 'success',
			),
			admin_url( 'admin.php' )
		);
		wp_safe_redirect( $url );
		exit;
	}

	private static function current_notice(): ?array {
		if ( empty( $_GET['instascore_notice'] ) ) {
			return null;
		}
		return array(
			'type'    => 'error' === ( $_GET['instascore_status'] ?? '' ) ? 'error' : 'success',
			'message' => sanitize_text_field( wp_unslash( (string) $_GET['instascore_notice'] ) ),
		);
	}

	private static function provider_options( string $sport ): array {
		return 'basketball' === $sport
			? array(
				'approved_basketball_provider' => __( 'Approved basketball provider', 'instascore-platform' ),
				'api_basketball'               => __( 'API-Basketball compatible', 'instascore-platform' ),
				'custom_basketball_provider'   => __( 'Custom basketball provider', 'instascore-platform' ),
			)
			: array(
				'approved_football_provider' => __( 'Approved football provider', 'instascore-platform' ),
				'api_football'               => __( 'API-Football compatible', 'instascore-platform' ),
				'custom_football_provider'   => __( 'Custom football provider', 'instascore-platform' ),
			);
	}

	private static function labelize( string $key ): string {
		return ucwords( (string) preg_replace( '/(?<!^)[A-Z]/', ' $0', str_replace( array( '_', '-' ), ' ', $key ) ) );
	}
}
