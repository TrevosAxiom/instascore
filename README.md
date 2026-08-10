# InstaScore Platform

InstaScore is a mobile-first sports competition platform delivered as a custom WordPress plugin with a React and TypeScript application.

## Current capabilities

- Public scores, fixtures, results, competition, team and player directories.
- Live match centres with Server-Sent Events and polling fallback.
- Standings, statistics, discipline and result confirmation.
- League administration, scheduling, registrations and match operations.
- Fantasy games, favourites, search, notifications and personal feeds.
- Football and basketball provider synchronisation.
- PWA installation, offline scoring queues, embeds and competition portals.
- WordPress capability-based administration and append-oriented audit records.

## Requirements

- WordPress 6.6+ with REST and pretty permalinks enabled.
- PHP 8.2+, Composer 2, and MySQL 8 or compatible MariaDB.
- Node.js 22+ and pnpm 11.9.
- HTTPS in production for PWA, notifications and reliable live updates.

## Installation

1. Keep this directory at `wp-content/plugins/instascore-platform`.
2. Run `composer install`.
3. Run `pnpm install --frozen-lockfile`.
4. Run `pnpm build`.
5. Set `INSTASCORE_ENVIRONMENT` to `production`.
6. Activate **InstaScore Platform** in WordPress.

Activation applies database migrations through schema version 12, grants the platform capabilities, and provisions the public and administration host pages. Nested application URLs are handled by the standalone SPA template, so match and competition links remain usable on refresh.

## Development

Set these constants in local WordPress configuration or equivalent environment variables:

```php
define( 'INSTASCORE_ENVIRONMENT', 'development' );
define( 'INSTASCORE_VITE_DEV_SERVER', 'http://localhost:5173' );
```

Run `pnpm dev`. Production reads hashed JavaScript and CSS paths from `dist/.vite/manifest.json`.

## Quality gates

```bash
composer check
pnpm check
pnpm test:e2e
```

## Releases

Routine pushes do not trigger plugin updates. Installable WordPress updates are published
only from GitHub Releases whose tag matches the version in `instascore-platform.php`. See
`DEPLOYMENT.md` for the release, installation and rollback workflow.

See `docs/architecture.md`, `docs/rest-api.md`, `docs/routes-and-screens.md`, `docs/notifications.md`, and `docs/manual-qa.md` for implementation and verification details.
