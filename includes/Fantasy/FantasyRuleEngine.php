<?php
/**
 * Fantasy scoring rule engine.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Fantasy;

final class FantasyRuleEngine {
	/**
	 * @param array<int,array<string,mixed>> $events Match events.
	 * @param array<int,array<string,mixed>> $rules Scoring rules.
	 * @return array<int,array<string,mixed>>
	 */
	public function calculate_player_points( array $events, array $rules, string $status = 'provisional' ): array {
		$by_event = array();
		foreach ( $rules as $rule ) {
			$type = (string) $rule['event_type'];
			if ( ! isset( $by_event[ $type ] ) ) {
				$by_event[ $type ] = $rule;
			}
		}
		$points = array();
		foreach ( $events as $event ) {
			if ( ! empty( $event['voided_at'] ) || empty( $event['primary_player_id'] ) ) {
				continue;
			}
			$type = (string) $event['event_type'];
			if ( ! isset( $by_event[ $type ] ) ) {
				continue;
			}
			$rule      = $by_event[ $type ];
			$player_id = (int) $event['primary_player_id'];
			$points[]  = array(
				'playerId'      => $player_id,
				'matchEventId'  => (int) $event['id'],
				'fixtureId'     => (int) $event['fixture_id'],
				'eventType'     => $type,
				'points'        => (int) $rule['points'],
				'ruleVersion'   => (int) $rule['version'],
				'status'        => $status,
				'breakdown'     => array(
					'type'   => $type,
					'label'  => str_replace( '_', ' ', $type ),
					'points' => (int) $rule['points'],
				),
			);
			$conditions       = is_array( $rule['conditions'] ?? null ) ? $rule['conditions'] : json_decode( (string) ( $rule['conditions_json'] ?? '{}' ), true );
			$secondary_points = (int) ( $conditions['secondaryPoints'] ?? 0 );
			if ( $secondary_points && ! empty( $event['secondary_player_id'] ) ) {
				$points[] = array(
					'playerId' => (int) $event['secondary_player_id'], 'matchEventId' => (int) $event['id'],
					'fixtureId' => (int) $event['fixture_id'], 'eventType' => $type . '_secondary', 'points' => $secondary_points,
					'ruleVersion' => (int) $rule['version'], 'status' => $status,
					'breakdown' => array( 'type' => $type . '_secondary', 'label' => (string) ( $conditions['secondaryLabel'] ?? 'Secondary player contribution' ), 'points' => $secondary_points ),
				);
			}
		}
		return $points;
	}

	/**
	 * @param array<int,array<string,mixed>> $squad_entries Squad entries with points.
	 */
	public function squad_total( array $squad_entries ): int {
		return array_sum(
			array_map(
				function ( array $entry ): int {
					$multiplier = ! empty( $entry['is_captain'] ) ? 2 : ( ! empty( $entry['is_vice_captain'] ) ? 1 : 1 );
					$bench      = 'bench' === ( $entry['slot_type'] ?? $entry['slotType'] ?? '' ) ? 0 : 1;
					return (int) ( $entry['points'] ?? 0 ) * $multiplier * $bench;
				},
				$squad_entries
			)
		);
	}
}
