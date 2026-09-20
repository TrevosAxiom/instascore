# Launch acceptance — 0.23.0-rc.4

## Automated gates

- PHP syntax and PHPUnit suites pass on PHP 8.2.
- Frontend formatting, lint, type checking, unit tests and production build pass.
- `pnpm release:audit` confirms matching versions, schema migration 22, PWA output, manifest integrity, prohibited-file exclusions and the 2 MB compiled-code budget.
- The GitHub release workflow accepts stable and `-rc.N` tags and only publishes an installable ZIP after all checks pass.

## Staging acceptance

1. Take and verify a host-level database backup; download the recovery manifest from Operations.
2. Install the RC ZIP on staging and confirm migration 22 creates the commerce tables.
3. Run Operations → Production preflight and resolve every attention item.
4. Verify guest navigation, sign-up/login, install flow, offline relaunch and theme switching on iOS Safari, Android Chrome and desktop Chrome/Edge.
5. Exercise Flag, Soccer, Basketball and NFL scores across previous, current and next dates, including one live match and one completed match centre.
6. Exercise admin, umpire, scorekeeper and team-manager workspaces with least-privilege accounts.
7. Create one ticket, membership and merchandise product; confirm server pricing, payment settlement, ticket redemption, entitlement dates and fulfilment.
8. Run a provider sync, RSS sync, push test, livestream readiness check and sponsor report.
9. Verify application logs contain no secrets, PHP fatals, failed migrations or recurring scheduler errors.

## Go-live controls

- Keep automatic payment settlement disabled until a payment provider and signed webhook validation are configured.
- Use a real system cron to call `wp-cron.php`; verify provider, notification, RSS and maintenance schedules after deployment.
- Publish the RC only to the intended acceptance cohort. Promote to a stable version after the staging checklist passes.
- Roll back by deploying the prior release ZIP and restoring the verified database backup if migration or data acceptance fails.
