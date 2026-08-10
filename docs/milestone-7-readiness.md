# Milestone 7 readiness

Milestone 6 leaves InstaScore ready for notification work when these checks are
complete locally:

- Production Vite build produces `dist/sw.js`, `dist/manifest.webmanifest`,
  icons and offline fallback.
- Browser registers `/instascore-sw.js` with scope `/`.
- Offline scorekeeping queue can create pending events, retry them and expose
  revision conflicts.
- OneSignal or any future notification SDK is integrated into the existing root
  worker instead of registering a second service worker.
- Push notification routes must respect current WordPress REST nonce,
  capability and assignment checks.
