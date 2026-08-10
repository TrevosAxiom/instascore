# Milestone 10 Report: External Basketball API Integration

## Scope delivered

- Basketball provider adapter using the existing `SportsProviderInterface`.
- Shared provider sync pipeline reused from football; no duplicate mapping/log subsystem.
- Basketball-specific normalizer for competitions, teams, players, games, live games, standings and statistics.
- Basketball period/quarter/overtime state exposed only under sport-aware `sportState`.
- Public cached basketball live endpoint and React match-centre shell.
- Admin provider dashboard now switches between football and basketball.
- Basketball scheduler hook added beside football scheduler hook.

## Provider configuration

Server-side configuration:

```php
define( 'INSTASCORE_BASKETBALL_PROVIDER', 'approved_basketball_provider' );
define( 'INSTASCORE_BASKETBALL_API_BASE_URL', 'https://api-basketball.instascore.local/v1' );
define( 'INSTASCORE_BASKETBALL_API_KEY', 'server-only-key' );
```

The API key is read only in PHP and is not exposed to React, Vite, bootstrap settings or public REST contracts.

## Provider endpoints used

The basketball adapter calls these paths under `INSTASCORE_BASKETBALL_API_BASE_URL`:

- `/competitions`
- `/teams`
- `/players`
- `/games`
- `/games/live`
- `/standings`
- `/statistics`

## Basketball-specific normalisation

Basketball games normalize to the shared provider game shape where practical:

- provider ID
- competition/season provider IDs
- home/away provider IDs
- home/away display names
- total score
- start time
- normalized status

Basketball-only fields are nested under `sportState`:

- `period`
- `periodLabel`
- `periodScores`
- `overtimePeriods`
- `scoreReconciled`

Quarter totals must reconcile with full score. If totals differ, `scoreReconciled` is false so the UI can warn and mapping/admin workflows can investigate instead of silently trusting bad data.

Multiple overtime periods are represented as `OT`, `OT2`, `OT3`, etc.

## Status handling

- `NS`, `SCHEDULED` → `scheduled`
- `Q1`, `Q2`, `Q3`, `Q4`, `OT`, `LIVE`, `IN_PLAY` → `live`
- `HT`, `HALFTIME` → `halftime`
- `FT`, `AOT`, `FINAL` → `completed`
- `CANC`, `CANCELLED` → `cancelled`
- `PST`, `POSTPONED` → `postponed`
- unknown statuses → `draft`

## Public/API/UI

- Admin provider dashboard: `/admin/providers`
- Public basketball page: `/basketball`
- Admin health endpoint: `/wp-json/instascore/v1/admin/providers/basketball/health`
- Admin sync endpoint: `/wp-json/instascore/v1/admin/providers/basketball/sync`
- Public cached live endpoint: `/wp-json/instascore/v1/basketball/live`

The public endpoint returns normalized cached games with a last-known timestamp in metadata. Raw provider response structures do not leak.

## Synchronisation schedules

Shared schedule policy:

- live games: target every 30 seconds
- near-start games: target every 5 minutes within 2 hours
- future games: hourly
- completed games: twice daily until confirmed

The plugin registers a WordPress cron baseline for future basketball games. Production live frequency should be handled with Action Scheduler or real server cron.

## Verification

Passed:

- `pnpm check`
- Prettier
- ESLint
- TypeScript typecheck
- Vitest: 15 files / 26 tests
- Production Vite/PWA build

Blocked:

- PHP lint and PHPUnit because `php` and `composer` are not available on PATH in this shell.

## Limitations

- The specification does not name a concrete basketball vendor; the adapter is environment-configured like the football provider.
- Canonical-table import reconciliation remains mapping/log driven and should be hardened before production provider traffic.
- Team/player statistics normalize common points/rebounds/assists fields; exact advanced stats depend on the chosen provider plan.
- Real high-frequency live sync should use Action Scheduler or server cron rather than visitor-triggered WP-Cron.
