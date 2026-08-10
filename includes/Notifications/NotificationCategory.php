<?php
/**
 * Notification category constants.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Notifications;

final class NotificationCategory {
	public const MATCH_STARTING           = 'match_starting';
	public const SCORE_CHANGE             = 'score_change';
	public const FINAL_SCORE              = 'final_score';
	public const FIXTURE_CHANGE           = 'fixture_change';
	public const TEAM_NEWS                = 'team_news';
	public const COMPETITION_ANNOUNCEMENT = 'competition_announcement';
	public const FANTASY_DEADLINE         = 'fantasy_deadline';
	public const FANTASY_POINTS_UPDATE    = 'fantasy_points_update';
	public const FANTASY_LEAGUE_MOVEMENT  = 'fantasy_league_movement';
	public const SCOREKEEPER_ASSIGNMENT   = 'scorekeeper_assignment';
	public const RESULT_CONFIRMATION      = 'result_awaiting_confirmation';
	public const PROVIDER_FAILURE         = 'provider_failure';

	/**
	 * @return string[]
	 */
	public static function all(): array {
		return array(
			self::MATCH_STARTING,
			self::SCORE_CHANGE,
			self::FINAL_SCORE,
			self::FIXTURE_CHANGE,
			self::TEAM_NEWS,
			self::COMPETITION_ANNOUNCEMENT,
			self::FANTASY_DEADLINE,
			self::FANTASY_POINTS_UPDATE,
			self::FANTASY_LEAGUE_MOVEMENT,
			self::SCOREKEEPER_ASSIGNMENT,
			self::RESULT_CONFIRMATION,
			self::PROVIDER_FAILURE,
		);
	}
}
