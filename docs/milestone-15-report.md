# Milestone 15 Report: Performance, Security and Accessibility Hardening

## Baseline measurements

Before implementation, the existing check passed:

- `pnpm check`
- `20` frontend test files.
- `37` frontend tests.
- Production Vite/PWA build passed.

Baseline production bundle from the pre-hardening build:

- Main app chunk: about `279.96 kB` / `83.87 kB gzip`.
- MUI chunk: about `334.04 kB` / `101.30 kB gzip`.
- Route modules were eagerly imported from `AppRoutes.tsx`.
- Live fixture detail and scorekeeper controls polled every `5s`, including hidden-tab scenarios.

Audit findings used as evidence:

- `pnpm audit --audit-level high` initially found high-severity advisories in `react-router` and `brace-expansion`.
- REST route grep found explicit `permission_callback` entries for custom routes.
- Public `__return_true` callbacks were used for public read endpoints only.
- Secret search found provider and OneSignal keys are read server-side through `Config` and adapter classes.
- Reduced-motion CSS was already present.

## Performance hardening implemented

- Added route-level lazy loading in `src/app/AppRoutes.tsx`.
- Added a Suspense loading state for lazy routes.
- Split admin, operations, provider, fantasy, fixture, team, player, standings, search and notification pages into route chunks.
- Changed live match polling to stop when the browser tab is hidden.
- Kept foreground live polling at `5s` for match centre and scorekeeper controls.
- Added explicit operations repository allowlists for table/order usage.

After implementation production build:

- Main app chunk: about `219.46 kB` / `68.62 kB gzip`.
- MUI chunk: about `334.04 kB` / `101.30 kB gzip`.
- Route chunks now range roughly from `0.32 kB` to `7.24 kB`.
- Precache grew to `48` entries because split chunks are now emitted separately.

Measured improvement:

- Main app chunk reduced by about `60.5 kB` before gzip.
- Main app gzip reduced by about `15.25 kB`.

## Security hardening implemented

- Upgraded `react-router` to patched `^8.3.0`.
- Added pnpm overrides for patched `minimatch` and `brace-expansion`.
- Regenerated `pnpm-lock.yaml`.
- `pnpm audit --audit-level high` now reports no known vulnerabilities.
- Added frontend security guardrail tests:
  - no server-only OneSignal/provider secret config names in browser source;
  - every custom REST route has an explicit `permission_callback`.
- Tightened `OperationsRepository` with explicit allowlists for recent-log tables and order columns.
- Verified generated `dist` does not contain server-only config names or bearer-token-shaped secrets.

## Accessibility hardening implemented

- Added a polite `aria-live` score announcement to the live scoreboard.
- Added an accessible score summary label to the live scoreboard.
- Strengthened global visible focus styles.
- Added global `44px` minimum touch target rules for interactive controls inside the app shell.
- Preserved the existing reduced-motion media query.
- Updated route tests to account for lazy route loading.
- Added test coverage for the live scoreboard status region.

## Verification

Passed:

- `pnpm audit --audit-level high`
- `pnpm check`
  - Prettier format check.
  - ESLint.
  - TypeScript type checking.
  - Vitest frontend tests: `21` files, `39` tests.
  - Production Vite build.
  - PWA service-worker build.
- Generated bundle secret scan:
  - no server-only provider/OneSignal config names;
  - no bearer-token-shaped values.

Unavailable in this local shell:

- PHP CLI linting.
- Composer/PHPUnit.

Reason: `php` and `composer` are not available on PATH.

## Remaining risks

- Core Web Vitals and WCAG need browser/device measurement against the real `http://instascore.local/` WordPress environment.
- PHP integration tests still need a local PHP/Composer runtime.
- Object-cache/Redis compatibility was reviewed conceptually; Redis is not available in this local shell for runtime verification.
- Provider-job and notification-job batching are still mostly architectural foundations from earlier milestones and should be validated under real queue volume.
- Full file-upload hardening should be retested with actual WordPress upload settings and media-library constraints.
