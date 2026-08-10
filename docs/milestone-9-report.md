# Milestone 9 Report: External Football API Integration

## Provider adapter

Implemented the approved project configuration as `approved_football_provider`, configured by:

- `INSTASCORE_FOOTBALL_PROVIDER`
- `INSTASCORE_FOOTBALL_API_BASE_URL`
- `INSTASCORE_FOOTBALL_API_KEY`

No provider secret is passed to React or included in bootstrap settings.

## Provider endpoints used by the adapter

The generic football adapter calls these server-side paths under `INSTASCORE_FOOTBALL_API_BASE_URL`:

- `/competitions`
- `/teams`
- `/fixtures`
- `/fixtures/live`
- `/standings`
- `/players`

Raw provider payloads are normalized before internal services or REST/admin UI consume them.

## Schema

Migration `0008` adds:

- `instascore_provider_mappings`
- `instascore_provider_sync_logs`

Mappings are unique by `provider_name + entity_type + provider_object_id`. Sync logs store dry-run state, filters, preview payload, status, rate-limit metadata, retry hints, last-known timestamp and errors.

## Rate limits, caching and failure behavior

- HTTP `429` responses become rate-limited sync failures with retry hints.
- Sync logs preserve the last-known timestamp and preview payload for outage visibility.
- Admin health reports whether the provider is configured and whether any secrets are exposed.
- Public/internal contracts use normalized records only.
- Repeated imports are idempotent through provider mappings and request hashes.

## Schedules

Cron foundation:

- live fixtures: every 30 seconds target cadence
- near-start fixtures: every 5 minutes target cadence
- future fixtures: hourly
- completed fixtures: twice daily until confirmed

The current WordPress cron hook schedules the hourly/future baseline; higher-frequency live cadences should be backed by a real server cron or Action Scheduler in production.

## UI and REST

- Admin provider health dashboard: `/admin/providers`
- REST health: `/wp-json/instascore/v1/admin/providers/football/health`
- REST sync: `/wp-json/instascore/v1/admin/providers/football/sync`

The dashboard supports dry-run preview, commit mode selection, mapping-conflict visibility, recent sync logs, and provider health.

## Verification

Passed:

- `pnpm check`
- Prettier
- ESLint
- TypeScript typecheck
- Vitest: 14 files / 25 tests
- Production Vite/PWA build

Blocked:

- PHP lint and PHPUnit because `php` and `composer` are not available on PATH in this shell.

## Limitations

- The build document did not name a concrete football vendor; the adapter is generic and configured by the approved environment variables.
- Internal team/fixture/standing import is normalized and mapped, with canonical-table upsert expansion left as the next hardening step before live production data.
- Match-event import is represented by the provider contract/normalization boundary; exact event fields depend on the chosen provider plan.
- Real high-frequency sync should use Action Scheduler or server cron rather than visitor-triggered WP-Cron alone.
