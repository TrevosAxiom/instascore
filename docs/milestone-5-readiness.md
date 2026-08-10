# Milestone 5 readiness

Milestone 4 provides fixture scheduling foundations only. The next milestone can
start once the WordPress/PHP test runner is available locally and the fixture
admin flows have been manually smoke-tested in WordPress.

## Ready

- Fixture migration `0004` adds core fixture, fixture-official and status
  history tables.
- Public UUIDs are used at the REST boundary.
- Kickoff is stored in UTC and rendered in the React UI using the user/browser
  timezone.
- Public fixtures/results and match-centre shell routes are implemented.
- Protected admin fixture creation and status-transition endpoints are
  implemented with nonce/capability protection.
- Schedule conflict warnings are returned for teams, venues and officials.
- Mutation audit logging and status history append inside transactions.
- Frontend lint, typecheck, tests and production build pass.

## Must verify before Milestone 5

- Install/restore PHP and Composer on PATH and run `composer check` /
  `vendor/bin/phpunit`.
- Activate the plugin locally and confirm migration `4` applies.
- Visit `/fixtures`, `/results`, `/fixtures/{uuid}` and `/admin/fixtures` on
  `http://instascore.local/`.
- Create a draft fixture, move it to scheduled, postpone it, reschedule it and
  confirm audit/status history rows.
- Confirm unauthorized users cannot call protected fixture endpoints.

## Still intentionally deferred

- Scoring events, tables, standings and statistics.
- Scorekeeper operations UI.
- PWA, OneSignal and provider sync.
- Fantasy logic.
