# Database and migration plan

Schema version `5` uses ordered, checksummed migrations.

- `0001` creates `instascore_migrations`.
- `0002` creates sports, competitions, seasons, stages, groups and audit logs.
- `0003` creates teams, players, venues, officials, team-season registrations,
  team staff, team assignments and player positions.
- `0004` creates fixtures, fixture-official assignments and fixture status
  history.
- `0005` creates scorekeeper assignments, match clock states, append-oriented
  match events and fixture lineups.

Exposed rows have numeric internal IDs and unique UUIDs. Domain tables include
status, source, provider identity, UTC timestamps, actor IDs and revision.
Indexed numeric relationships are translated to UUIDs at the REST boundary.

Competition types are `league`, `cup`, `tournament`, `friendly` and `group`.
Rules are JSON limited to 30 validated lowercase keys with scalar values.
Active season date ranges are inclusive and cannot overlap within a
competition. Competitions and seasons are archived rather than deleted.

Audit logs are append-only and index entity history, actor/time and request
UUID. Competition and season snapshots are written in the same transaction as
their mutation.

Milestone 3 keeps player identity independent from team membership. Player rows
do not store a current team; active and historical membership is derived from
`instascore_team_registrations`. The registration table indexes player-season
and team-season jersey lookups to reject duplicate active registrations and
jersey conflicts.

Team logos and player photos store WordPress attachment IDs, URLs, MIME type
and size after validation. Accepted image descriptors are JPEG, PNG and WebP up
to 2 MB.

Milestone 4 stores fixture kickoff in UTC (`kickoff_at`) with the source
timezone retained for audit/context. Fixtures relate to competition, season,
optional stage/group, home/away teams and optional venue. Public IDs are UUIDs.
Statuses are `draft`, `scheduled`, `warmup`, `live`, `halftime`, `interval`,
`suspended`, `postponed`, `cancelled`, `abandoned`, `completed` and
`confirmed`. `instascore_fixture_status_history` records status transitions in
the same transaction as the fixture update. Knockout foundations are present as
nullable source/next fixture links and bracket slots; scoring and bracket
rendering remain later milestones.

Before production activation, back up the database. If `0004` fails, restore
the backup, retain schema version `3`, fix the cause and rerun.

Milestone 5 makes `instascore_match_events` the authoritative scoring stream.
Rows are append-oriented and keyed by fixture/client event ID for idempotency.
`sequence_number` and `revision` increase per fixture. Corrections are stored by
voiding an event and optionally linking a correction through `corrects_event_id`;
published events are not hard deleted. Scores are reproduced by reducing
non-voided scoring events.

Before production activation, back up the database. If `0005` fails, restore
the backup, retain schema version `4`, fix the cause and rerun.
