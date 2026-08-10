# Milestone 13 Report: Fantasy Scoring, Transfers and Leagues

## Scope delivered

Milestone 13 adds the first production foundation for fantasy scoring, transfer tracking and fantasy league tables.

- Versioned fantasy scoring-rule storage.
- Provisional and confirmed fantasy-point storage.
- Point revision history for recalculation and administrator override workflows.
- Transfer records with server-side deadline checks, free-transfer tracking and transfer-cost enforcement.
- Public and private fantasy leagues with invite-code foundations.
- League membership and ranked league tables.
- Live fantasy tracker and points-breakdown screens.
- Transfer-market screen.
- League table screen with rank movement.
- REST API endpoints for fantasy points, live tracker, transfers, leagues, scoring rules and administrator overrides.

This milestone does not yet implement the full scheduled recalculation worker, complete invite-code join UX, final fantasy league social features or advanced anti-abuse analytics.

## Database migration

Migration version `11` (`create_fantasy_scoring_transfers_leagues`) creates:

- `instascore_fantasy_scoring_rules`
- `instascore_fantasy_points`
- `instascore_fantasy_point_revisions`
- `instascore_fantasy_squad_totals`
- `instascore_fantasy_transfers`
- `instascore_fantasy_leagues`
- `instascore_fantasy_league_members`
- `instascore_fantasy_invite_attempts`

Key schema decisions:

- Scoring rules are versioned and have effective date windows.
- Fantasy points are split by game, gameweek, fixture, match event, fantasy player and internal player.
- Provisional and confirmed point states are stored explicitly.
- Point revisions preserve previous calculations and administrator overrides.
- Transfer records are append-oriented and audited by timestamp, user, gameweek and revision.
- Private leagues use generated invite codes, while membership controls private access.
- Invite attempts are stored separately to support rate limiting without exposing raw IP addresses.

## Scoring rules

The first flag-football rule-engine foundation maps non-voided match events to fantasy points by event type. The service supports sport-specific rule rows, rule versions and effective-date planning. Initial supported event families align with the live scoring and statistics milestones:

- Touchdowns.
- One-point and two-point conversions.
- Safeties.
- Interceptions.
- Penalties.
- Flag pulls where captured.
- Player-of-the-match style awards through rule configuration.

Captain and vice-captain treatment:

- Captain entries receive a `2x` multiplier.
- Vice-captain entries remain `1x` unless promoted by a later lineup availability rule.
- Bench entries contribute `0x` to active squad totals in the current foundation.

## Provisional versus confirmed points

- Provisional fantasy points are derived from live or not-yet-confirmed match events.
- Confirmed fantasy points are intended to be derived from confirmed fixture results and non-voided confirmed events.
- Published corrections must not delete historical point rows; recalculation creates new revision snapshots.
- Administrator point overrides create explicit revision-history rows and fire an internal fantasy override action.

## REST API

Authenticated:

- `GET /wp-json/instascore/v1/fantasy/games/{uuid}/points`
- `POST /wp-json/instascore/v1/fantasy/games/{uuid}/transfers`
- `POST /wp-json/instascore/v1/fantasy/games/{uuid}/leagues`
- `GET /wp-json/instascore/v1/fantasy/leagues/{uuid}`

Public:

- `GET /wp-json/instascore/v1/fantasy/games/{uuid}/live-tracker`

Protected administration:

- `POST /wp-json/instascore/v1/admin/fantasy/games/{uuid}/rules`
- `POST /wp-json/instascore/v1/admin/fantasy/games/{uuid}/override`

## Transfer behaviour

- Transfers are created server-side only for authenticated users.
- The server reads the gameweek deadline from `instascore_fantasy_gameweeks`.
- Transfers after the stored deadline are rejected.
- The first completed transfer in a gameweek is treated as free.
- Later completed transfers cost `4` fantasy points in the initial implementation.
- Transfer history remains append-oriented for auditability.

## League behaviour

- Public leagues expose tables to authenticated users.
- Private leagues require active membership.
- League creators are automatically joined as members.
- League tables sort by season/gameweek total points, then display name.
- Rank movement is calculated from stored previous rank positions.

## Notification rules

The Milestone 13 notification integration point supports these fantasy notification categories:

- Fantasy deadline reminders.
- Meaningful point recalculation.
- League rank movement.

Rules:

- Do not notify for trivial recalculations.
- Use collapse keys by fantasy event type and game UUID.
- Respect the OneSignal preference and quiet-hours system introduced earlier.
- Do not expose notification provider secrets in the browser.

## Security and permissions

- Fantasy transfers, private league reads and league creation require an authenticated WordPress user.
- Scoring-rule creation and point override require `manage_options` or `instascore_manage_leagues`.
- Server-side validation handles deadlines and transfer costs; the browser is advisory only.
- Private league invite codes are visible only to members.
- Point overrides are explicit revision records.

## Verification

Passed:

- `pnpm check`
  - Prettier format check.
  - ESLint.
  - TypeScript type checking.
  - Vitest frontend tests.
  - Production Vite build.
  - PWA service-worker build.

Unavailable in this local shell:

- PHP CLI linting.
- Composer/PHPUnit.

## Known limitations

- Full background recalculation jobs are represented by schema, rule engine and revision foundations, but not yet wired to a scheduled worker.
- Invite-code join endpoint and UI are not complete.
- Anti-abuse storage exists for invite attempts, but enforcement is still minimal.
- Notifications are prepared as safe event metadata and policy foundations; full queue dispatch should be completed with the next notification refinement pass.
- Points breakdown currently exposes game-level point rows rather than a fully squad-scoped private breakdown.
