# Milestone 16.5 Report: Admin UX and Settings Bridge

Milestone 16.5 addresses the admin-dashboard gap found after the hardening milestone. It does not add post-launch Milestone 17 features; it makes the existing administration and operations surface discoverable and usable.

## Scope completed

- Added a dedicated `/admin` dashboard instead of sending administrators straight into competition setup.
- Added `/admin/settings` for operational settings, feature flags, maintenance mode, notification emergency disable and data-retention controls.
- Added a reusable administration navigation bar shown on `/admin/*` and `/operations/*` routes for authorised users.
- Preserved existing competition administration at `/admin/competitions`.
- Added WordPress page provisioning for `admin/competitions` and `admin/settings`.
- Bumped the plugin version to `0.16.5` so page provisioning can run again on existing local installs.

## Migration impact

No database migration was added. Milestone 16.5 reuses the existing operations settings API and options storage from Milestone 14.

## Security decisions

- `/admin/*` remains behind `accessAdmin`.
- `/operations/*` remains behind `accessOperations`.
- Settings UI only exposes safe operational toggles. Server secrets such as provider keys and the OneSignal REST API key remain in WordPress constants or environment configuration.
- Admin navigation is capability-aware and only shows links matching the current user's capabilities.

## Build and deployment implications

- Production Vite build now includes separate lazy chunks for admin overview and settings.
- Existing WordPress pages are reprovisioned because `INSTASCORE_PLATFORM_VERSION` changed from `0.15.0` to `0.16.5`.
- No service-worker scope or cache-strategy changes were made.

## Manual QA checklist

1. Visit `/admin` as an administrator and confirm the Admin Dashboard appears.
2. Confirm the admin navigation includes Settings.
3. Open `/admin/competitions` and confirm competition setup still works.
4. Open `/admin/settings` and toggle maintenance mode.
5. Confirm provider keys and OneSignal REST keys are never visible in page source or browser bundles.
6. Visit `/operations` and confirm the admin navigation remains available.

## Known limitations

- Settings currently covers operational controls only. Brand asset upload, full site navigation editing and per-role UI customisation should be designed separately before implementation.
- PHP/Composer checks depend on local PHP tooling being available on PATH.

## Readiness for Milestone 17

- Admin operators now have a clear control centre.
- Existing operational safety controls are discoverable.
- Future WOW-factor modules should be selected through a design/approval step before coding.
