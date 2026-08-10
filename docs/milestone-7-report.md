# Milestone 7 report: Standings, Statistics and Discipline

Milestone 7 adds deterministic standings/statistics projections and audited
discipline foundations. Match events remain the source of truth.

## Calculation rules

- Only confirmed fixtures are included in standings/statistics rebuilds.
- Only non-voided match events are reduced into scores/statistics.
- Default competition points:
  - win: 3
  - draw: 1
  - loss: 0
- Competition rules may override `win_points`, `draw_points`, `loss_points`
  and `tiebreakers` from rules JSON.
- Points for, points against and point difference are calculated from the
  authoritative event reducer inputs.
- Form is the last five confirmed results per team using `W`, `D`, `L`.
- Supported first-version flag-football player/team stats include touchdowns,
  passing touchdowns, rushing touchdowns, receiving touchdowns, interceptions,
  safeties, flag pulls, penalties and player of the match.

## Tiebreakers

Default order:

1. points
2. wins
3. point difference
4. points for
5. head-to-head foundation
6. team name

Head-to-head is intentionally a foundation layer in this milestone. The sort is
stable and deterministic even when head-to-head cannot separate teams.

## Migrations

Migration `0006` creates:

- `instascore_standings`
- `instascore_standings_snapshots`
- `instascore_team_statistics`
- `instascore_player_statistics`
- `instascore_disciplinary_records`
- `instascore_suspensions`

`INSTASCORE_DB_VERSION` is now `6`.

## Rebuild triggers

- Result confirmation.
- Confirmed fixture status change, abandonment or result-state change.
- Match event void/correction flow.
- Manual/admin rebuild endpoint.
- WP-CLI deterministic rebuild command.

## Rebuild command

```bash
wp instascore standings rebuild --competition_id=1 --season_id=1
```

The rebuild reads confirmed fixtures/events in stable kickoff/id/sequence order,
replaces derived projection rows inside a transaction, writes a historical
snapshot and stores a rebuild hash.

## REST and screens

- `GET /wp-json/instascore/v1/competitions/{uuid}/standings`
- `GET /wp-json/instascore/v1/teams/{uuid}/statistics`
- `GET /wp-json/instascore/v1/players/leaders?stat=touchdowns`
- `POST /wp-json/instascore/v1/admin/discipline`
- `POST /wp-json/instascore/v1/admin/standings/rebuild`

React routes:

- `/standings`
- `/teams/:uuid/statistics`
- `/players/leaders`
- `/admin/discipline`

## Security and audit decisions

- Public standings/statistics are read-only and cacheable.
- Discipline creation requires fixture-management capability.
- Manual standings rebuild requires result-confirmation capability.
- Discipline changes are audited.
- Manual standings rebuilds write audit records and snapshots.
- Suspension records are created when discipline type is `suspension`.

## Manual QA

1. Run migration to DB version 6.
2. Confirm a completed fixture with scoring events.
3. Verify standings rows are recalculated.
4. Void a scoring event and verify the table/statistics rebuild.
5. Open `/standings`.
6. Open `/players/leaders`.
7. Open `/admin/discipline` as an administrator and create a suspension.
8. Confirm an audit row and a suspension row are written.
9. Run the WP-CLI rebuild command twice and confirm the same rebuild hash.

## Known limitations

- PHP checks could not run in this shell because PHP/Composer are not on PATH.
- The public `/standings` route currently uses the API foundation and placeholder
  competition UUID until a competition selector is wired into the shell.
- Head-to-head tiebreaker is a stable foundation, not full multi-team mini-table
  logic yet.
- Suspension warnings are exposed at service level for lineup workflows, but the
  full lineup creation UI is not yet present.

## Readiness checklist for Milestone 8

- Verify DB migration `0006` on the Local WordPress database.
- Confirm PHP lint/PHPUnit in an environment with PHP and Composer available.
- Manually test recalculation after result confirmation and event correction.
- Confirm discipline/suspension audit rows.
- Decide whether Milestone 8 should complete head-to-head mini-table logic or
  keep it as a later competition-rules enhancement.
