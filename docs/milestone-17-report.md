# Milestone 17 Report: Approved Experience Upgrades

Approved scope implemented:

- Real-time live match centre via Server-Sent Events.
- Embeddable widgets.
- White-label competition portals.

## Real-time live match centre via SSE

The public match centre now attempts to connect to:

`/wp-json/instascore/v1/fixtures/{fixture_uuid}/live/stream`

The stream emits `live-state` events containing the same normalized public live-match state already used by polling. The server score reducer remains authoritative; SSE is transport only.

Fallback behaviour:

- If `EventSource` is unavailable, the app keeps using existing polling.
- If the stream errors, the frontend closes it and returns to polling.
- Public payloads remain provisional until confirmed.

## Embeddable widgets

Added embed routes:

- `/embed/live/{fixture_uuid}`
- `/embed/fixture/{fixture_uuid}`
- `/embed/table/{competition_uuid}`

Embed routes intentionally render without the normal InstaScore top bar or bottom navigation so they can be used inside iframes or partner pages.

## White-label competition portals

Added route:

- `/portal/{competition_uuid}`

The portal uses public competition, fixture and standings APIs. A safe optional `portalAccent` value may be read from competition rules when it is a valid hex colour. Otherwise it falls back to the InstaScore gold accent.

## Migration impact

No database migration was required for this pass. Portal configuration is foundation-level and currently derived from existing competition fields/rules.

## Security and privacy

- SSE and embed routes are public read-only surfaces.
- No authentication nonce or server secret is exposed to widgets.
- Raw provider responses are not exposed.
- Scoring mutations remain on protected operations/admin routes.

## Rollout and rollback

- Roll out behind route availability and public page provisioning.
- Rollback is safe by reverting the new frontend routes and SSE endpoint; existing polling match centre remains intact.

## Known limitations

- The WordPress REST SSE endpoint returns an event-stream snapshot. Long-held streaming depends on hosting/proxy buffering support.
- Widget script generation is not yet packaged as a copy-paste admin tool; current usage is iframe-route based.
- Portal brand management is not yet a full admin CRUD workflow.
