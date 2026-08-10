# Milestone 4 readiness

- [x] Schema version `3` is wired into the migration runner.
- [x] Teams, players, venues, officials and registrations have custom tables.
- [x] Player records do not store a direct current team.
- [x] Historical team-season registrations are preserved.
- [x] Duplicate active player-season registrations are rejected.
- [x] Jersey conflicts are rejected within the same team and season.
- [x] Team administrators are scoped to assigned team UUIDs.
- [x] CSV registration import supports template metadata, dry-run preview and
      transaction-safe commit.
- [x] Public team and player directory/profile shells exist.
- [ ] Smoke-test migration `0003` on a disposable MySQL database.
- [ ] Verify real WordPress media uploads and attachment metadata.
- [ ] Verify team-assignment user meta with two real users.
- [ ] Approve mobile and desktop team/player/admin screens.

Milestone 4 may add fixtures and scheduling only after this checklist is
accepted.
