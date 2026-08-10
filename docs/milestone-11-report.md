# Milestone 11 Report: Favourites, Personalisation and Alerts

## Scope delivered

Milestone 11 adds privacy-safe personalisation without implementing fantasy squad logic.

- Authenticated users can follow and unfollow teams, competitions and players.
- Guests can keep anonymous local favourites in the browser.
- Anonymous favourites are merged into the authenticated profile after successful login.
- A server-side favourites API, personal feed foundation, alert-history API and search API are available under `instascore/v1`.
- The notification preference centre now includes user timezone, language and preferred-sports foundations.
- OneSignal targeting tags are updated after follow/unfollow using non-sensitive entity identifiers.
- Favourites and search screens are mounted as React routes and provisioned WordPress pages.

## Database changes

Migration version `9` (`create_favourites_personalisation`) creates:

- `instascore_user_favourites`
  - Stores `user_id`, public `entity_type`, `entity_uuid`, `status`, `source`, `alerts_enabled`, `unfollowed_at`, `created_at`, `updated_at`.
  - Unique key on `user_id + entity_type + entity_uuid` makes follow upserts idempotent.
- `instascore_user_preferences`
  - Stores timezone, language, preferred sports JSON and privacy version per user.
- `instascore_recent_views`
  - Foundation for authenticated or anonymous recently viewed records.
- `instascore_alert_history`
  - Stores delivery status, suppression flag, launch URL and entity context for user-visible alert history.

## REST API

- `GET /wp-json/instascore/v1/me/favourites`
- `POST /wp-json/instascore/v1/me/favourites`
- `DELETE /wp-json/instascore/v1/me/favourites/{entityType}/{entityUuid}`
- `POST /wp-json/instascore/v1/me/favourites/merge`
- `GET /wp-json/instascore/v1/me/preferences`
- `PUT /wp-json/instascore/v1/me/preferences`
- `GET /wp-json/instascore/v1/me/feed`
- `GET /wp-json/instascore/v1/me/alerts`
- `GET /wp-json/instascore/v1/search?q={term}`

## Privacy and security decisions

- Anonymous favourites stay in `localStorage` until login and are removed only after a successful server merge.
- Server personalisation is keyed to the WordPress user ID; public UUIDs are used for exposed sports entities.
- Preferences intentionally store only delivery-safe data: timezone, language and preferred sports.
- OneSignal tags use entity type plus UUID with hyphens removed; names, emails and sensitive profile attributes are not sent as tags.
- Unfollow disables alerts and records notification-follow status as muted, allowing future alert suppression.
- Mutating favourites and preferences require WordPress authentication and REST nonce support through the existing API client.
- The public search endpoint returns normalized internal contracts, not provider response payloads.

## Notification implications

- Follow creates an active notification follow record and returns tag metadata.
- Unfollow creates a muted notification follow record, disables favourite alerts and returns suppression metadata.
- Frontend OneSignal adapter adds active tags and removes muted tags after follow changes.
- Alert history is prepared for delivery logs from Milestone 8 notification events.
- Quiet hours remain category-specific and are now complemented by profile-level timezone and language settings.

## Anonymous-to-authenticated migration

The browser stores anonymous favourites as `{ entityType, entityUuid }` records in `localStorage`. Once authentication resolves with a WordPress user UUID, `FavouritesProvider` sends the local records to `/me/favourites/merge`. The server validates UUID/type, performs idempotent upserts with source `anonymous_migration`, and the browser clears the local cache only after the merge succeeds.

## Manual QA

1. Visit `/favourites` as a guest and add a local favourite.
2. Confirm `localStorage.instascore-anonymous-favourites` contains the local record.
3. Log in and revisit the app; confirm local favourites merge into `/me/favourites`.
4. Follow a team, competition and player by UUID.
5. Unfollow one entity and confirm future alerts are suppressed for that target.
6. Visit `/notifications`, change timezone/language/preferred sports and save.
7. Search for a known competition, team, player and fixture from `/search`.
8. Open a push deep link and confirm React routes resolve inside the SPA.

## Verification

- `pnpm check` passed:
  - Prettier format check
  - ESLint
  - TypeScript build/typecheck
  - Vitest frontend tests: 17 files, 30 tests
  - Production Vite/PWA build

PHP syntax/PHPUnit could not be executed in this local shell because `php` and `composer` are not available on PATH.

## Known limitations

- Personal feed currently returns favourites and suggestion foundations; rich scored-feed ranking will mature once more result/feed data is available.
- Recently viewed storage is migrated but not yet fully instrumented from every entity screen.
- Search is simple SQL `LIKE` across current entities and fixture round names; full ranking/tokenization is deferred.
- OneSignal follow tags are frontend-updated after actions; production delivery still depends on configured OneSignal credentials and worker availability.
