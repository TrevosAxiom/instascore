# Milestone 6 readiness

Milestone 5 adds live flag-football scoring foundations without standings,
statistics, offline queues, notifications, provider sync or fantasy.

## Event schema summary

`instascore_match_events` is append-oriented. Key fields:

- `uuid`: public event identifier.
- `fixture_id`: internal fixture relationship.
- `client_event_id`: caller-provided idempotency key, unique per fixture.
- `sequence_number`: monotonically increasing fixture event order.
- `revision`: monotonically increasing fixture scoring revision.
- `event_type`: touchdown, conversion, safety, interception, penalty, timeout,
  possession change, period start or period end.
- `team_side` / `team_id`: home/away attribution where applicable.
- `primary_player_id` / `secondary_player_id`: optional player attribution.
- `period`, `clock_seconds`, `points`, `description`, `payload_json`.
- `voided_at`, `voided_by`, `void_reason`, `corrects_event_id`.

The authoritative score is reproduced by reducing non-voided events.

## Manual scorekeeping test

1. Confirm DB schema version `5`.
2. Create or choose a scheduled fixture with home and away teams.
3. Assign a scorekeeper to the fixture.
4. Open `/operations/fixtures/{fixtureUuid}` as that scorekeeper.
5. Claim the fixture.
6. Start the clock.
7. Add home touchdown, home one-point conversion and away safety.
8. Refresh the public `/fixtures/{fixtureUuid}` page and confirm provisional
   score/timeline polling.
9. Void the conversion and confirm the score is reduced from history.
10. Submit the same client event ID twice through REST and confirm no duplicate
    score.
11. Submit with a stale `expectedRevision` and confirm a conflict response.
12. Complete the match, then confirm result as commissioner.

## Known limitations

- No offline event queue or reconnect merge.
- No standings/table/statistics updates.
- No advanced clock countdown calculation; clock state is persisted as supplied
  transition state.
- Scorekeeper UI uses quick event panels; richer player/lineup pickers are
  foundation-only.
- PHP tests are present but require local PHP/Composer PATH restoration.

## Ready for Milestone 6 when

- PHP lint and PHPUnit run successfully locally.
- Manual scorekeeping flow above passes on `http://instascore.local/`.
- Assignment scoping is verified with a non-admin scorekeeper account.
- Commissioner confirmation is verified after scorekeeper completion.
