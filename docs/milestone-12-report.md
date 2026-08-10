# Milestone 12 Report: Fantasy Foundation

## Scope delivered

Milestone 12 adds the first fantasy-sports foundation only. It does not implement final fantasy points, transfers, fantasy leagues or leaderboards.

- Fantasy game administration foundation.
- Fantasy seasons and gameweeks schema.
- Player pool and player price schema.
- Position definitions and squad constraint schema.
- Authenticated squad read/save/submit API.
- Server-side squad validation.
- Revision-based stale-write detection.
- Gameweek deadline locking.
- Squad history snapshots.
- Public fantasy-game information and player-pool endpoints.
- React fantasy dashboard, squad builder, formation view and player selection.
- React fantasy administration setup screen.

## Database migration

Migration version `10` (`create_fantasy_foundation`) creates:

- `instascore_fantasy_games`
- `instascore_fantasy_seasons`
- `instascore_fantasy_gameweeks`
- `instascore_fantasy_positions`
- `instascore_fantasy_players`
- `instascore_fantasy_squads`
- `instascore_fantasy_squad_players`
- `instascore_fantasy_squad_history`

Key schema decisions:

- Fantasy games carry budget, squad size, starting size, bench size, team-limit and formation rules.
- Fantasy players link to internal players, optional internal teams and fantasy positions.
- Squads are unique per `user_id + fantasy_game_id + gameweek_id`.
- Squads use `revision` for optimistic locking.
- Squad entries store starting/bench slot, captain and vice-captain flags.
- Squad history stores immutable JSON snapshots for draft/save/submit preservation.

## REST API

Public:

- `GET /wp-json/instascore/v1/fantasy/games`
- `GET /wp-json/instascore/v1/fantasy/games/{uuid}`
- `GET /wp-json/instascore/v1/fantasy/games/{uuid}/players`

Authenticated:

- `GET /wp-json/instascore/v1/fantasy/games/{uuid}/squad`
- `POST /wp-json/instascore/v1/fantasy/games/{uuid}/squad`
- `POST /wp-json/instascore/v1/fantasy/games/{uuid}/squad/submit`

Protected admin:

- `POST /wp-json/instascore/v1/admin/fantasy/games`

## Validation rules

All authoritative checks happen in PHP service code, not just React:

- Budget total cannot exceed `fantasy_games.budget_cents`.
- Submitted squads must match configured squad size.
- Submitted starting lineup must match configured starting size.
- Position min/max squad constraints are enforced on submit.
- Duplicate fantasy players are rejected.
- Players outside the selected fantasy game are rejected.
- Max players per real team is enforced.
- Exactly one captain and one vice-captain are required.
- Captain and vice-captain must not be the same selected entry.
- Gameweek deadline is checked with server time.
- Existing squads require matching `baseRevision`; stale writes return conflict.

## Deadline, concurrency and server authority

- Deadline: the server compares `fantasy_gameweeks.deadline_at` with current server time and rejects save/submit after lock.
- Concurrency: clients submit `baseRevision`; the server rejects mismatched revisions with a 409-style validation response.
- Server authority: React displays budget and formation guidance, but the PHP service remains the source of truth.
- History: each save/submit records a squad-history snapshot; submitted records are not silently overwritten without revision validation.

## Security decisions

- Public endpoints expose fantasy game/player-pool data only.
- Squad endpoints require WordPress authentication.
- Admin setup requires `manage_options` or `instascore_manage_leagues` until a dedicated fantasy-admin capability is introduced.
- No browser endpoint accepts or calculates fantasy points.
- No provider secrets or notification secrets are introduced.
- Browser validation is treated as advisory only.

## Verification

- `pnpm check` passed:
  - Prettier format check
  - ESLint
  - TypeScript typecheck
  - Vitest frontend tests: 18 files, 31 tests
  - Production Vite/PWA build

PHP syntax/PHPUnit could not be executed in this local shell because `php` and `composer` are not available on PATH.

## Known limitations

- Admin setup currently creates fantasy-game records only; full season/gameweek/player-pool maintenance UI is founded by schema/API but not fully exposed.
- Fantasy player prices and positions require seeded/admin data before fans can build meaningful squads.
- No scoring rules, transfers, leagues, live points, confirmed points or standings are implemented; those belong to Milestone 13.
- Backend PHP tests could not be run locally because PHP/Composer are unavailable in this environment.

## Manual QA checklist

1. Run migrations by activating/loading the plugin with `INSTASCORE_DB_VERSION` 10.
2. Seed or create a fantasy game, season, gameweek, positions and fantasy players.
3. Visit `/fantasy` and confirm game information and player pool render.
4. Sign in and select players into starting lineup/bench.
5. Save a draft and confirm a revision is returned.
6. Submit with invalid budget, invalid formation, duplicate player and missing captain to confirm server rejection.
7. Submit after changing the gameweek deadline into the past and confirm lock rejection.
8. Simulate two tabs by saving with an old `baseRevision` and confirm conflict.
9. Visit `/admin/fantasy` as an administrator and create a draft fantasy game.
