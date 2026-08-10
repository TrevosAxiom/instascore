# Known limitations

- Shortcode pages require a stable page URL because it becomes the SPA router
  basename.
- PHP is supplied by Local rather than the shell `PATH`. Its current
  configuration emits a non-fatal warning for a missing Imagick DLL; plugin
  syntax, PHPCS and PHPUnit checks still pass.
- The approved source logo is visually correct but large and should receive
  approved derivative sizing before the PWA asset milestone.
- No feature modules, seed data or end-to-end journeys.
- No PWA, service worker, offline queue, OneSignal or provider integration.
- No fixture, scoring, standings or fantasy logic.
- No PWA app icons have been derived from the logo.
- Migration `0002` has automated schema coverage but still needs activation
  smoke testing on a disposable MySQL database.
- Administration prioritises safe creation workflows; richer management
  tables and assignment tooling can be refined without expanding the domain.
- CSV parsing in the React admin screen is intentionally simple and does not
  support quoted commas. REST preview/commit remains authoritative.
- Real WordPress media upload UI is deferred; Milestone 3 validates and stores
  uploaded image descriptors and attachment metadata.
