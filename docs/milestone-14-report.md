# Milestone 14 Report: Administration, Reports and Operations

## Scope delivered

Milestone 14 adds a unified protected operations control room for administrators and operations users.

- System dashboard.
- Competition and live-fixture summary metrics.
- Active live fixtures and results-awaiting-confirmation counts.
- Provider failure and sync-log visibility.
- OneSignal/notification failure visibility.
- Offline-sync conflict and event-conflict visibility.
- Audit-log viewer foundation.
- Operations action log.
- Feature flags.
- Maintenance mode.
- Emergency disable for automated notifications.
- Data-retention setting.
- Manual failed-job retry foundation.
- Manual standings rebuild foundation.
- Manual fantasy recalculation foundation.
- Redacted CSV/diagnostic export foundation.
- Search/filter over operational logs in the React dashboard.

Existing dedicated admin screens remain available for deeper provider, notification, fixture, team, competition, fantasy and discipline workflows.

## Database migration

Migration version `12` (`create_operations_controls`) creates:

- `instascore_operations_alerts`
- `instascore_operations_exports`
- `instascore_operations_actions`

It also initialises safe options:

- `instascore_feature_flags`
- `instascore_maintenance_mode`
- `instascore_data_retention_days`
- `instascore_admin_notification_disable`

## REST API

Protected operations read:

- `GET /wp-json/instascore/v1/operations/dashboard`

Protected administrator actions:

- `PUT /wp-json/instascore/v1/operations/settings`
- `POST /wp-json/instascore/v1/operations/actions/{action}`
- `POST /wp-json/instascore/v1/operations/exports/{type}`

Supported action keys:

- `retry_failed_jobs`
- `standings_rebuild`
- `fantasy_recalculation`
- `diagnostic_report`

## Permissions

- Dashboard read requires `instascore_access_operations` or `instascore_access_admin`.
- Mutating settings, exports and manual operational actions require `instascore_access_admin`.
- The React route `/operations` remains protected by the existing `accessOperations` route guard.
- WordPress REST nonce support continues to protect authenticated mutation requests through the existing API client.

## Sensitive-log redaction

Before logs or diagnostic data leave PHP, keys matching these sensitive families are redacted:

- secrets
- tokens
- API keys
- authorization headers
- passwords
- nonces
- cookies

Long string payloads are truncated to avoid exposing large provider, webhook or sync payloads in the browser. Diagnostic exports include summaries and redacted values only.

## Operations workflows

- Operators open `/operations`.
- Dashboard metrics surface active live fixtures, failed jobs, notification failures, conflicts and open alerts.
- Search narrows log sections client-side.
- Administrators can toggle maintenance mode and emergency notification disable.
- Administrators can adjust retention days.
- Administrators can toggle feature flags.
- Administrators can request failed-job retry, standings rebuild and fantasy recalculation through auditable action records.
- Administrators can prepare a redacted diagnostic CSV report.

## Verification

Passed:

- `pnpm check`
  - Prettier format check.
  - ESLint.
  - TypeScript type checking.
  - Vitest frontend tests: `20` files, `37` tests.
  - Production Vite build.
  - PWA service-worker build.

Unavailable in this local shell:

- PHP CLI linting.
- Composer/PHPUnit.

## Known limitations

- Manual rebuild/recalculation actions currently record and queue intent for the existing domain command/worker pipeline; deeper worker execution status should be expanded later.
- User role and assignment management is represented by the existing WordPress roles/capabilities model, but no full role-management UI was added in this milestone.
- CSV exports are diagnostic/report foundations, not full per-entity data exports yet.
- Operational pagination is backend-ready by limiting rows, but the React log viewer currently shows recent rows with client-side filtering.
- Maintenance mode is stored and visible, but global request blocking rules should be finalised before public launch.
