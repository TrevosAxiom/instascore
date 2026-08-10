# Milestone 6 report: Offline Match-Day PWA

Milestone 6 turns the existing InstaScore React shell and live scorekeeper screen
into an installable, root-scoped PWA for `http://instascore.local/`.

## Worker files and scope

- Root bridge: `/instascore-sw.js`, served by
  `InstaScore\Platform\Support\Pwa` from `dist/sw.js`.
- Manifest bridge: `/instascore.webmanifest`, served from
  `dist/manifest.webmanifest`.
- Offline bridge: `/instascore-offline.html`, served from `dist/offline.html`.
- Scope: `/`, enabled by the root URL and `Service-Worker-Allowed: /` header.
- Build source: `src/pwa/sw.ts`, compiled by `vite-plugin-pwa` with Workbox
  inject-manifest.

## Cache policies

- Precache: Vite-built app shell, CSS, generated icons, screenshots, manifest
  and offline fallback.
- Network-first: public live fixtures and match-event polling:
  `/wp-json/instascore/v1/fixtures`, `/results`, and
  `/fixtures/{uuid}/live`.
- Stale-while-revalidate: catalog-style public reads for sports, competitions,
  teams and players.
- Cache-first: immutable plugin assets under
  `/wp-content/plugins/instascore-platform/dist/` plus static image/font/script
  requests.
- Network-only: all non-GET requests, authentication, operations and admin
  writes.
- Bounded caches: versioned `m6-v1` cache names with Workbox expiration limits
  and quota purge for immutable assets.

## Offline scorekeeping queue

Queued score events are stored in IndexedDB database `instascore-match-day`,
store `scoreEvents`.

Each record contains:

- `clientEventId`
- `fixtureUuid`
- `payload`
- `deviceTimestamp`
- `user`
- `baseRevision`
- `retryCount`
- `syncState`: `pending`, `synced`, `failed` or `conflict`
- `error`, `serverRevision`, `updatedAt`

The scorekeeper UI saves locally before submission. Online submissions go
through the queue sync path so duplicate client event IDs remain visible as a
single local queue record and server idempotency remains the authority.

## Conflict handling

- The server remains authoritative for score, event revision and fixture
  lifecycle.
- Mutations remain network-only in the service worker.
- If replay receives HTTP 409, the queue marks the record as `conflict`.
- Conflicts are shown to the scorekeeper and require manual review/resync; they
  are not silently dropped.
- Failed non-conflict submissions retain retry count and error details.

## Service-worker integration point for Milestone 7

OneSignal must not take over the root service worker. Milestone 7 should extend
`src/pwa/sw.ts` or import OneSignal’s worker module from this single root worker,
then keep cache route ordering intact:

1. notification/push handlers,
2. network-only mutation/auth routes,
3. live-read and catalog-read runtime caching,
4. immutable asset caching.

## QA matrix

- Fresh load on `http://instascore.local/`.
- Confirm manifest is discoverable from page source.
- Confirm browser Application panel shows service worker scope `/`.
- Install app in Chromium and open in standalone mode.
- iOS manual: Share → Add to Home Screen guidance appears when not installed.
- Turn network offline, open cached app shell and scorekeeper screen.
- Add score event offline and confirm pending indicator.
- Restore network and confirm automatic sync.
- Use manual sync button after a failed retry.
- Submit duplicate client event ID and confirm no duplicate score.
- Submit stale revision and confirm visible conflict state.

## Offline limitations

- First visit must happen online so app shell and runtime caches exist.
- PHP-backed WordPress routes still need WordPress available; the PWA handles
  cached frontend shell and REST response caching, not a full offline WordPress
  runtime.
- Background Sync API is not used yet; retries run while the app is open and
  the browser dispatches `online`.
- IndexedDB tests use the runtime fallback when browser IndexedDB is absent in
  jsdom; real browser QA remains required.
- Lighthouse PWA audit was not run in this shell.

## Readiness checklist for Milestone 7

- Root service worker remains registered at `/instascore-sw.js`.
- Notification code must integrate into the existing worker, not register a
  competing worker.
- Mutation routes must stay network-only.
- Offline queue conflict UI should be manually verified on device.
- PWA install and standalone launch should be confirmed in Chrome/Edge on the
  local site.
