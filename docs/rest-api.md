# REST API

Namespace: `/wp-json/instascore/v1`.

Public endpoints are `GET /sports`, `GET /competitions`,
`GET /competitions/{uuid}`, `GET /teams`, `GET /teams/{uuid}`,
`GET /players`, `GET /players/{uuid}`, `GET /fixtures`,
`GET /fixtures/{uuid}` and `GET /results`. Lists accept `page`, `per_page`
(maximum 50), `sport`, `type`, `search`, `sort` and `order` where applicable.
Competition reads provide ETags and
`Cache-Control: public, max-age=60, stale-while-revalidate=300`.

Protected endpoints:

- `POST /admin/sports`
- `POST /admin/competitions`
- `PATCH /admin/competitions/{uuid}`
- `POST /admin/competitions/{uuid}/seasons`
- `PATCH /admin/seasons/{uuid}`
- `POST /admin/stages`
- `POST /admin/groups`
- `PATCH /admin/{sports|stages|groups}/{uuid}`
- `POST /admin/{sports|stages|groups}/{uuid}/{archive|restore}`
- `POST /admin/{competitions|seasons}/{uuid}/{archive|restore}`
- `POST /admin/teams`
- `POST /admin/players`
- `POST /admin/venues`
- `POST /admin/officials`
- `POST /admin/registrations`
- `GET /admin/registrations/import/template`
- `POST /admin/registrations/import/preview`
- `POST /admin/registrations/import/commit`
- `POST /admin/fixtures`
- `PATCH /admin/fixtures/{uuid}`
- `POST /admin/fixtures/{uuid}/status`
- `GET /fixtures/{uuid}/live`
- `POST /operations/fixtures/{uuid}/claim`
- `POST /operations/fixtures/{uuid}/release`
- `POST /operations/fixtures/{uuid}/clock/{action}`
- `POST /operations/fixtures/{uuid}/events`
- `POST /operations/fixtures/{uuid}/events/{eventUuid}/void`
- `POST /operations/fixtures/{uuid}/complete`
- `POST /admin/fixtures/{uuid}/scorekeepers`
- `POST /admin/fixtures/{uuid}/confirm-result`

Writes require WordPress cookie authentication, REST nonce, capability and
scope checks, validation and audit logging. Responses use the standard
`data`, `meta`, `errors` envelope and expose UUIDs rather than numeric IDs.

Registration import rows use `teamUuid`, `playerUuid`, `seasonUuid`,
`jerseyNumber`, `positionCode`, `eligibilityStatus` and `notes`. Preview
returns row-level errors without writes. Commit rejects any batch with preview
errors and writes accepted rows in a transaction.

Fixture writes use `competitionUuid`, `seasonUuid`, optional `stageUuid` and
`groupUuid`, `homeTeamUuid`, `awayTeamUuid`, optional `venueUuid`, `kickoffAt`,
`timezone`, optional round/bracket fields and optional officials. Kickoff is
stored in UTC. Status changes validate the transition map, append status
history and write audit logs in a transaction. Public fixture/result reads use
short cache headers.

Live event writes require `clientEventId`, `eventType`, `expectedRevision` and,
for team actions, `teamSide`. Supported flag-football event types are
`touchdown`, `one_point_conversion`, `two_point_conversion`, `safety`,
`interception`, `penalty`, `timeout`, `possession_change`, `period_start` and
`period_end`. Duplicate client event IDs for the same fixture return the
existing event state without duplicating score. Stale revisions return a
conflict envelope.
