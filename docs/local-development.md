# Local development

## Install

```bash
cp .env.example .env
composer install
pnpm install --frozen-lockfile
```

Configure WordPress for PHP 8.2+, HTTPS, REST and pretty permalinks. Add
`[instascore_app]` to a page.

## Development assets

Expose these as environment variables or WordPress constants:

```text
INSTASCORE_ENVIRONMENT=development
INSTASCORE_VITE_DEV_SERVER=http://localhost:5173
```

Run:

```bash
pnpm dev
```

WordPress enqueues `@vite/client` and `src/main.tsx` on the mount page.

## Production assets

```bash
pnpm build
```

Set `INSTASCORE_ENVIRONMENT=production`. WordPress reads
`dist/.vite/manifest.json` and loads the hashed module and stylesheet.

## Commands

```bash
composer lint:syntax
composer lint
composer test
composer check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm test:e2e
```

The Playwright suite remains empty until a stable WordPress test page URL is
available. Set `INSTASCORE_E2E_BASE_URL` when adding browser journeys.
