<?php
/**
 * Plugin runtime bootstrap.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform;

use InstaScore\Platform\Database\MigrationRunner;
use InstaScore\Platform\REST\AuthController;
use InstaScore\Platform\REST\AdminCompetitionController;
use InstaScore\Platform\REST\AdminFixtureController;
use InstaScore\Platform\REST\AdminMediaController;
use InstaScore\Platform\REST\AdminAccountController;
use InstaScore\Platform\REST\AdminFantasyController;
use InstaScore\Platform\REST\AdminScoringController;
use InstaScore\Platform\REST\AdminRssController;
use InstaScore\Platform\REST\AdminTeamPlayerController;
use InstaScore\Platform\REST\CompetitionController;
use InstaScore\Platform\REST\ContactController;
use InstaScore\Platform\REST\FixtureController;
use InstaScore\Platform\REST\FantasyController;
use InstaScore\Platform\REST\FantasyScoringController;
use InstaScore\Platform\REST\FavouriteController;
use InstaScore\Platform\REST\HealthController;
use InstaScore\Platform\REST\NotificationController;
use InstaScore\Platform\REST\NewsController;
use InstaScore\Platform\REST\OperationsController;
use InstaScore\Platform\REST\ProviderController;
use InstaScore\Platform\REST\OperationsScoringController;
use InstaScore\Platform\REST\PublicScoringController;
use InstaScore\Platform\REST\StandingsController;
use InstaScore\Platform\REST\TeamPlayerController;
use InstaScore\Platform\REST\ThemeController;
use InstaScore\Platform\Support\Assets;
use InstaScore\Platform\Support\AdminSettings;
use InstaScore\Platform\Support\PageProvisioner;
use InstaScore\Platform\Support\NewsProvisioner;
use InstaScore\Platform\Support\Pwa;
use InstaScore\Platform\Support\ProviderScheduler;
use InstaScore\Platform\Support\RssScheduler;
use InstaScore\Platform\Support\Shortcode;
use InstaScore\Platform\Support\StandingsCommand;

final class Bootstrap {
	private static ?self $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function register(): void {
		add_action( 'plugins_loaded', array( $this, 'maybe_migrate' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_action( 'init', array( Shortcode::class, 'register' ) );
		add_action( 'init', array( PageProvisioner::class, 'maybe_create_pages' ), 20 );
		add_action( 'init', array( NewsProvisioner::class, 'maybe_create_categories' ), 21 );
		add_action( 'template_redirect', array( Pwa::class, 'maybe_serve_asset' ), 0 );
		add_action( 'template_redirect', array( Shortcode::class, 'hide_admin_bar_for_app' ) );
		add_filter( 'template_include', array( Shortcode::class, 'use_standalone_template' ), 99 );
		add_filter( 'pre_handle_404', array( Shortcode::class, 'handle_spa_404' ), 10, 2 );
		add_filter( 'redirect_canonical', array( Shortcode::class, 'prevent_spa_canonical_redirect' ), 10, 2 );
		add_action( 'wp_enqueue_scripts', array( Assets::class, 'maybe_enqueue' ), 100 );
		add_action( 'wp_head', array( Assets::class, 'print_theme_bootstrap' ), 1 );
		add_action( 'wp_head', array( Pwa::class, 'print_head_tags' ), 2 );
		add_action( 'init', array( StandingsCommand::class, 'register' ) );
		add_action( 'init', array( ProviderScheduler::class, 'register' ) );
		add_action( 'init', array( RssScheduler::class, 'register' ) );
		add_action( 'admin_menu', array( AdminSettings::class, 'register_menu' ) );
		add_action( 'admin_post_instascore_save_settings', array( AdminSettings::class, 'save_settings' ) );
		add_action( 'admin_post_instascore_run_operation', array( AdminSettings::class, 'run_operation' ) );
	}

	public function maybe_migrate(): void {
		if ( (int) get_option( 'instascore_db_version', 0 ) < INSTASCORE_DB_VERSION ) {
			MigrationRunner::create()->run();
		}
	}

	public function register_rest_routes(): void {
		( new HealthController() )->register();
		( new AuthController() )->register();
		( new ThemeController() )->register();
		( new CompetitionController() )->register();
		( new ContactController() )->register();
		( new AdminCompetitionController() )->register();
		( new TeamPlayerController() )->register();
		( new AdminTeamPlayerController() )->register();
		( new FixtureController() )->register();
		( new AdminFixtureController() )->register();
		( new AdminMediaController() )->register();
		( new AdminRssController() )->register();
		( new AdminAccountController() )->register();
		( new FantasyController() )->register();
		( new FantasyScoringController() )->register();
		( new AdminFantasyController() )->register();
		( new PublicScoringController() )->register();
		( new OperationsScoringController() )->register();
		( new AdminScoringController() )->register();
		( new StandingsController() )->register();
		( new NotificationController() )->register();
		( new OperationsController() )->register();
		( new ProviderController() )->register();
		( new FavouriteController() )->register();
		( new NewsController() )->register();
	}

	private function __construct() {}
}
