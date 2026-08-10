<?php
/**
 * League bootstrap tools for real-world onboarding.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Services;

use wpdb;

final class LeagueBootstrapService {
	private string $prefix;

	public function __construct( private readonly wpdb $database ) {
		$this->prefix = $this->database->prefix . 'instascore_';
	}

	public static function create(): self {
		global $wpdb;
		return new self( $wpdb );
	}

	public function seed_cffl_lagos( int $user_id = 0 ): array {
		$now = gmdate( 'Y-m-d H:i:s' );
		$this->database->query( 'START TRANSACTION' );
		try {
			$sport_id       = $this->upsert_sport( $now, $user_id );
			$venue_id       = $this->upsert_venue( $now, $user_id );
			$competition_id = $this->upsert_competition( $sport_id, $now, $user_id );
			$season_id      = $this->upsert_season( $competition_id, $now, $user_id );
			$team_ids       = $this->upsert_teams( $sport_id, $venue_id, $now, $user_id );
			$fixture_count  = $this->upsert_fixtures( $competition_id, $season_id, $venue_id, $team_ids, $now, $user_id );
			$accounts       = $this->upsert_accounts();
			$this->database->query( 'COMMIT' );
			update_option( 'instascore_cffl_lagos_bootstrapped_at', gmdate( 'c' ), false );
			return array(
				'status'      => 'completed',
				'competition' => 'CFFL Lagos',
				'teams'       => count( $team_ids ),
				'fixtures'    => $fixture_count,
				'accounts'    => $accounts,
				'message'     => 'CFFL Lagos league workspace, starter teams, fixtures and app accounts are ready. Replace placeholder rules and generated logos with verified league assets before public launch.',
			);
		} catch ( \Throwable $error ) {
			$this->database->query( 'ROLLBACK' );
			return array(
				'status'  => 'failed',
				'message' => $error->getMessage(),
			);
		}
	}

	private function upsert_sport( string $now, int $user_id ): int {
		$existing = $this->database->get_var( "SELECT id FROM {$this->prefix}sports WHERE slug = 'flag-football' LIMIT 1" );
		if ( $existing ) {
			return (int) $existing;
		}
		$this->database->insert(
			$this->prefix . 'sports',
			$this->shared(
				array(
					'name'        => 'Flag Football',
					'slug'        => 'flag-football',
					'config_json' => wp_json_encode( array( 'periods' => 2, 'playersPerSide' => 7 ) ),
				),
				$now,
				$user_id
			)
		);
		return (int) $this->database->insert_id;
	}

	private function upsert_venue( string $now, int $user_id ): int {
		$existing = $this->database->get_var( "SELECT id FROM {$this->prefix}venues WHERE slug = 'cffl-lagos-primary-field' LIMIT 1" );
		if ( $existing ) {
			return (int) $existing;
		}
		$this->database->insert(
			$this->prefix . 'venues',
			$this->shared(
				array(
					'name'          => 'CFFL Lagos Primary Field',
					'slug'          => 'cffl-lagos-primary-field',
					'city'          => 'Lagos',
					'country_code'  => 'NG',
					'address'       => 'Lagos, Nigeria',
					'metadata_json' => wp_json_encode( array( 'sourceStatus' => 'pending_verification' ) ),
				),
				$now,
				$user_id
			)
		);
		return (int) $this->database->insert_id;
	}

	private function upsert_competition( int $sport_id, string $now, int $user_id ): int {
		$existing = $this->database->get_var( "SELECT id FROM {$this->prefix}competitions WHERE slug = 'cffl-lagos' LIMIT 1" );
		$rules    = array(
			'verificationNotice'     => 'CFFL Lagos workspace rules are pending official verification. Replace with the league rulebook before public launch.',
			'format'                 => '7-on-7 flag football league',
			'seasonStructure'        => 'Regular season plus playoffs',
			'field'                  => 'Flag football field; exact local dimensions to be confirmed by league operators',
			'scoring'                => array( 'touchdown' => 6, 'safety' => 2, 'onePointConversion' => 1, 'twoPointConversion' => 2 ),
			'clock'                  => array( 'periods' => 2, 'runningClock' => true, 'timeoutPolicy' => 'Configurable per competition' ),
			'contact'                => 'Non-contact flag pulls; blocking/contact standards must be confirmed by the league',
			'overtime'               => 'Foundation enabled; exact overtime format to be confirmed',
			'standings'              => array( 'win' => 3, 'draw' => 1, 'loss' => 0 ),
			'tiebreakers'            => array( 'points', 'pointDifference', 'pointsFor', 'headToHeadFoundation' ),
			'portalAccent'           => '#f7c948',
			'providerPollingEnabled' => true,
		);
		if ( $existing ) {
			$this->database->update(
				$this->prefix . 'competitions',
				array(
					'rules_json' => wp_json_encode( $rules ),
					'updated_at' => $now,
					'updated_by' => $user_id,
				),
				array( 'id' => (int) $existing )
			);
			return (int) $existing;
		}
		$this->database->insert(
			$this->prefix . 'competitions',
			$this->shared(
				array(
					'sport_id'          => $sport_id,
					'name'              => 'CFFL Lagos',
					'slug'              => 'cffl-lagos',
					'competition_type'  => 'league',
					'description'       => 'CFFL Lagos flag football league workspace.',
					'country_code'      => 'NG',
					'rules_json'        => wp_json_encode( $rules ),
					'archived_at'       => null,
				),
				$now,
				$user_id
			)
		);
		return (int) $this->database->insert_id;
	}

	private function upsert_season( int $competition_id, string $now, int $user_id ): int {
		$existing = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$this->prefix}seasons WHERE competition_id = %d AND slug = '2026' LIMIT 1", $competition_id ) );
		if ( $existing ) {
			return (int) $existing;
		}
		$this->database->insert(
			$this->prefix . 'seasons',
			$this->shared(
				array(
					'competition_id' => $competition_id,
					'name'           => '2026 Season',
					'slug'           => '2026',
					'start_date'     => '2026-08-01',
					'end_date'       => '2026-12-15',
					'archived_at'    => null,
				),
				$now,
				$user_id
			)
		);
		return (int) $this->database->insert_id;
	}

	private function upsert_teams( int $sport_id, int $venue_id, string $now, int $user_id ): array {
		$teams = array(
			array( 'Lagos Lightning', 'Lightning', '#f7c948', '#0c1a2c' ),
			array( 'Eko Spartans', 'Spartans', '#0c1a2c', '#f7c948' ),
			array( 'Island Raptors', 'Raptors', '#1e88e5', '#ffffff' ),
			array( 'Mainland Titans', 'Titans', '#15b8a6', '#06101f' ),
			array( 'Lekki Waves', 'Waves', '#00a3ff', '#ffffff' ),
			array( 'Ikeja Hawks', 'Hawks', '#ef4444', '#ffffff' ),
		);
		$ids = array();
		foreach ( $teams as $team ) {
			$slug     = sanitize_title( $team[0] );
			$existing = $this->database->get_var( $this->database->prepare( "SELECT id FROM {$this->prefix}teams WHERE sport_id = %d AND slug = %s LIMIT 1", $sport_id, $slug ) );
			if ( $existing ) {
				$ids[] = (int) $existing;
				continue;
			}
			$this->database->insert(
				$this->prefix . 'teams',
				$this->shared(
					array(
						'sport_id'           => $sport_id,
						'name'               => $team[0],
						'slug'               => $slug,
						'short_name'         => $team[1],
						'home_venue_id'      => $venue_id,
						'logo_attachment_id' => null,
						'logo_url'           => $this->logo_data_uri( $team[1], $team[2], $team[3] ),
						'logo_mime_type'     => 'image/svg+xml',
						'logo_size_bytes'    => 900,
						'metadata_json'      => wp_json_encode( array( 'logoStatus' => 'generated_placeholder', 'league' => 'CFFL Lagos' ) ),
					),
					$now,
					$user_id
				)
			);
			$ids[] = (int) $this->database->insert_id;
		}
		return $ids;
	}

	private function upsert_fixtures( int $competition_id, int $season_id, int $venue_id, array $team_ids, string $now, int $user_id ): int {
		$count = 0;
		for ( $i = 0; $i < min( 6, count( $team_ids ) ); $i += 2 ) {
			$kickoff = gmdate( 'Y-m-d H:i:s', strtotime( '2026-08-01 15:00:00 UTC +' . ( $i * 45 ) . ' minutes' ) );
			$exists  = $this->database->get_var(
				$this->database->prepare(
					"SELECT id FROM {$this->prefix}fixtures WHERE competition_id = %d AND home_team_id = %d AND away_team_id = %d AND kickoff_at = %s LIMIT 1",
					$competition_id,
					$team_ids[ $i ],
					$team_ids[ $i + 1 ],
					$kickoff
				)
			);
			if ( $exists ) {
				continue;
			}
			$this->database->insert(
				$this->prefix . 'fixtures',
				$this->shared(
					array(
						'competition_id'           => $competition_id,
						'season_id'                => $season_id,
						'stage_id'                 => null,
						'group_id'                 => null,
						'home_team_id'             => $team_ids[ $i ],
						'away_team_id'             => $team_ids[ $i + 1 ],
						'venue_id'                 => $venue_id,
						'kickoff_at'               => $kickoff,
						'timezone'                 => 'Africa/Lagos',
						'round_name'               => 'Week 1',
						'match_day'                => 1,
						'leg_number'               => null,
						'bracket_slot'             => '',
						'home_source_fixture_id'   => null,
						'away_source_fixture_id'   => null,
						'winner_next_fixture_id'   => null,
						'loser_next_fixture_id'    => null,
						'metadata_json'            => wp_json_encode( array( 'sourceStatus' => 'seeded_by_admin' ) ),
					),
					$now,
					$user_id,
					'scheduled'
				)
			);
			$count++;
		}
		return $count;
	}

	private function upsert_accounts(): array {
		$accounts = array(
			array( 'cffl_admin', 'instascore_league_administrator', 'cffl.admin@example.test' ),
			array( 'cffl_scorekeeper', 'instascore_scorekeeper', 'cffl.scorekeeper@example.test' ),
			array( 'cffl_team_admin', 'instascore_team_administrator', 'cffl.teamadmin@example.test' ),
		);
		$result = array();
		foreach ( $accounts as $account ) {
			$user = get_user_by( 'login', $account[0] );
			if ( ! $user ) {
				$user_id = wp_insert_user(
					array(
						'user_login'   => $account[0],
						'user_pass'    => wp_generate_password( 24, true ),
						'user_email'   => $account[2],
						'display_name' => ucwords( str_replace( '_', ' ', $account[0] ) ),
						'role'         => $account[1],
					)
				);
			} else {
				$user_id = $user->ID;
				$user->set_role( $account[1] );
			}
				$result[] = array( 'username' => $account[0], 'role' => $account[1], 'created' => ! is_wp_error( $user_id ), 'passwordResetRequired' => true );
		}
		return $result;
	}

	private function shared( array $row, string $now, int $user_id, string $status = 'active' ): array {
		return array_merge(
			array(
				'uuid'               => wp_generate_uuid4(),
				'status'             => $status,
				'source'             => 'internal',
				'provider_name'      => null,
				'provider_object_id' => null,
				'created_by'         => $user_id,
				'updated_by'         => $user_id,
				'created_at'         => $now,
				'updated_at'         => $now,
				'revision'           => 1,
			),
			$row
		);
	}

	private function logo_data_uri( string $label, string $background, string $foreground ): string {
		$text = esc_html( strtoupper( substr( $label, 0, 2 ) ) );
		$svg  = "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='{$background}'/><path d='M24 48h208v160H24z' fill='none' stroke='{$foreground}' stroke-width='12'/><text x='128' y='148' font-size='72' font-family='Arial,sans-serif' font-weight='900' text-anchor='middle' fill='{$foreground}'>{$text}</text></svg>";
		return 'data:image/svg+xml;base64,' . base64_encode( $svg );
	}
}
