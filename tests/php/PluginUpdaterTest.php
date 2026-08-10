<?php

use InstaScore\Platform\Support\PluginUpdater;
use PHPUnit\Framework\TestCase;

final class PluginUpdaterTest extends TestCase {
	protected function setUp(): void {
		$GLOBALS['instascore_test_site_transients']['instascore_platform_latest_release'] = array(
			'version'    => '99.0.0-rc.1',
			'packageUrl' => 'https://github.com/TrevosAxiom/instascore/releases/download/v99.0.0-rc.1/instascore-platform-v99.0.0-rc.1.zip',
			'htmlUrl'    => 'https://github.com/TrevosAxiom/instascore/releases/tag/v99.0.0-rc.1',
			'notes'      => 'Release candidate.',
		);
	}

	public function test_exposes_cached_release_candidate_as_wordpress_update(): void {
		$transient = (object) array( 'response' => array() );
		$result    = PluginUpdater::check_for_update( $transient );
		$plugin    = plugin_basename( INSTASCORE_PLATFORM_FILE );

		$this->assertSame( '99.0.0-rc.1', $result->response[ $plugin ]->new_version );
		$this->assertStringEndsWith( '.zip', $result->response[ $plugin ]->package );
	}

	public function test_enables_background_updates_only_for_instascore(): void {
		$this->assertTrue( PluginUpdater::enable_auto_update( false, (object) array( 'slug' => 'instascore-platform' ) ) );
		$this->assertFalse( PluginUpdater::enable_auto_update( false, (object) array( 'slug' => 'another-plugin' ) ) );
	}
}
