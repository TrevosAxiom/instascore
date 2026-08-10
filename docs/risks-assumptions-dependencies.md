# Risks, assumptions and dependencies

## Assumptions

- The plugin directory is the Git repository boundary, not the entire Local
  WordPress core installation.
- Production provides PHP 8.2+, MySQL 8/MariaDB equivalent, HTTPS, REST and
  pretty permalinks.
- A single canonical origin hosts WordPress, SPA assets and later service
  workers.
- The supplied prototype and embedded logo are approved visual references.

## Risks

- Local PHP and Composer are not currently on `PATH`; CI runs backend checks,
  but local activation still needs the Local PHP runtime exposed to the shell.
- WordPress hosting limits may constrain workers, cron, transactions or long
  migrations; verify staging capabilities before domain schema work.
- The full proposed schema is broad. Each migration must be narrowed and
  performance-reviewed in its owning milestone.
- OneSignal/PWA worker scope and iOS behavior require early deployment testing,
  though implementation is deferred.
- Provider licensing, quotas, retention and data attribution are undecided.
- The React shell needs manual keyboard, mobile viewport and contrast testing
  in WordPress; dense tables remain future scope.
- No explicit data retention, privacy, backup RPO/RTO or supported-browser
  policy has yet been approved.

## Dependencies

WordPress, PHP, MySQL/MariaDB, Composer, Node/pnpm, React, Vite, TypeScript,
Material UI, TanStack Query, Zustand, React Hook Form, Zod, PHPUnit, PHPCS,
Vitest, Testing Library and Playwright. PWA tooling, Action Scheduler,
OneSignal and sports-provider SDKs are intentionally not installed in M0.
