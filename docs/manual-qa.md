# Milestone 1 and 2 manual QA

## Milestone 2

- [ ] Activate schema 2 on a backed-up disposable database.
- [ ] Create Flag Football, a league competition and valid season.
- [ ] Verify inverted and overlapping dates fail.
- [ ] Archive/restore and inspect the audit trail.
- [ ] Verify anonymous, missing-nonce and out-of-scope writes fail.
- [ ] Exercise filters, pagination, ETag and `304`.
- [ ] Review all states at 320px and desktop.

## Milestone 1 regression

- [ ] Activate the plugin without PHP warnings.
- [ ] Confirm `wp_instascore_migrations` contains version `1`.
- [ ] Confirm administrators receive both `instascore_access_*` capabilities.
- [ ] Add `[instascore_app]` to a page and load it while logged out.
- [ ] Open all nine initial routes and refresh each URL.
- [ ] Confirm desktop top navigation and mobile bottom navigation are keyboard usable.
- [ ] Confirm system theme follows the operating-system preference.
- [ ] Select light/dark, refresh, and confirm no incorrect-theme flash.
- [ ] Sign in, save a theme, and confirm it follows the account on a clean browser profile.
- [ ] Confirm guests are redirected from `/admin` and `/operations`.
- [ ] Confirm an administrator can enter both protected shells.
- [ ] Call `/health` and verify no sensitive host details appear.
- [ ] Call `/auth/status` logged out and logged in.
- [ ] Verify `PUT /me/theme` rejects missing/invalid nonce and invalid values.
- [ ] Set production mode and confirm only hashed `dist` assets load.
- [ ] Deactivate/reactivate and confirm migration `0001` is not duplicated.
- [ ] Confirm no competition, team, fixture, scoring, PWA, push, provider or fantasy feature exists.
