<?php
/**
 * External sports provider contract.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Providers;

interface SportsProviderInterface {
	/**
	 * @param array<string,mixed> $filters Provider filters.
	 * @return array<string,mixed>
	 */
	public function getCompetitions( array $filters ): array;

	/**
	 * @param array<string,mixed> $filters Provider filters.
	 * @return array<string,mixed>
	 */
	public function getFixtures( array $filters ): array;

	/**
	 * @param array<string,mixed> $filters Provider filters.
	 * @return array<string,mixed>
	 */
	public function getLiveFixtures( array $filters ): array;

	/**
	 * @return array<string,mixed>
	 */
	public function getStandings( string $competition_id, string $season_id ): array;

	/**
	 * @param array<string,mixed> $filters Provider filters.
	 * @return array<string,mixed>
	 */
	public function getTeams( array $filters ): array;

	/**
	 * @param array<string,mixed> $filters Provider filters.
	 * @return array<string,mixed>
	 */
	public function getPlayers( array $filters ): array;

	/**
	 * @param array<string,mixed> $filters Provider filters.
	 * @return array<string,mixed>
	 */
	public function getStatistics( array $filters ): array;
}
