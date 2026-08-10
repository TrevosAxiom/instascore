# Milestone 8 Report: OneSignal Push Notifications

## Scope delivered

- OneSignal Web SDK v16 custom-code bootstrap.
- Root-accessible `OneSignalSDKWorker.js` plus a safe `/push/onesignal/OneSignalSDKWorker.js` mirror for future coexistence.
- WordPress-secured configuration: browser-visible App ID only; REST API key remains server-side.
- Notification preference, subscription, follow, job and delivery-log tables.
- REST endpoints for preference center, subscription sync, follows, admin test send and worker deployment checks.
- Frontend OneSignal adapter with one-time SDK initialisation, identity login/logout and user-triggered permission prompt.
- Notification preference center and admin test-send page.
- Tests for SDK initialisation, identity flow, permission prompt timing and preference save UI.

## Worker coexistence

The existing PWA service worker remains `/instascore-sw.js` and is registered by the InstaScore PWA provider. The OneSignal SDK is configured with `/OneSignalSDKWorker.js`; InstaScore does not manually register a second OneSignal worker or combine WordPress-plugin automatic initialisation with SDK initialisation.

The root OneSignal worker imports the official OneSignal service worker script:

```js
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
```

The plugin bridge serves this file as `application/javascript` so deployment failures surface through `/wp-json/instascore/v1/admin/notifications/worker-check` instead of silently returning an HTML 404 page.

## Identity and preferences

- WordPress users already have stable InstaScore UUIDs.
- The frontend calls `OneSignal.login(user.uuid)` after authenticated state resolves.
- The frontend calls `OneSignal.logout()` when authenticated state becomes guest.
- Multiple browser/device subscriptions sync through `instascore_notification_subscriptions`.
- Notification preferences support categories, enabled/disabled state, quiet hours and timezone.
- Soft prompting is user-triggered; no native permission request runs on first load.

## Deduplication and delivery pipeline

The migration creates queue and delivery-log tables for:

`domain event -> queued job -> recipient resolver -> preference filter -> dedupe -> OneSignal adapter -> delivery log`

Initial categories and event foundations include fixture starts/status changes, score changes, completed/confirmed fixtures, postponements, scorekeeper assignment, result confirmation and fantasy deadline groundwork.

## Configuration

Set these server-side values in `wp-config.php`, Local environment variables or deployment secrets:

```php
define( 'INSTASCORE_ONESIGNAL_APP_ID', 'your-public-app-id' );
define( 'INSTASCORE_ONESIGNAL_REST_API_KEY', 'your-server-rest-api-key' );
define( 'INSTASCORE_NOTIFICATIONS_DISABLED', '0' );
define( 'INSTASCORE_NOTIFICATIONS_ALLOW_TEST_FIXTURES', '0' );
```

Do not create `VITE_` variables for the REST API key.

## Worker URLs

- PWA worker: `/instascore-sw.js`
- OneSignal worker: `/OneSignalSDKWorker.js`
- Safe OneSignal mirror: `/push/onesignal/OneSignalSDKWorker.js`
- Worker check: `/wp-json/instascore/v1/admin/notifications/worker-check`

## Known limitations

- Server-side queue processing is scaffolded at the schema/API level; a production cron/Action Scheduler runner should be expanded in Milestone 9+ when real notification volume exists.
- PHP lint/PHPUnit could not be executed in this Codex shell because `php` and `composer` are not on PATH.
- Browser delivery requires a real HTTPS origin or supported localhost behavior, a valid OneSignal App ID, and a configured OneSignal web push site.

## Browser QA matrix

- Chrome desktop: installable PWA remains active, OneSignal permission prompt appears only after button click.
- Edge desktop: same worker URLs return JavaScript and preference save works.
- Android Chrome: add-to-home-screen/PWA install remains separate from OneSignal subscription.
- iOS Safari: Add to Home Screen guidance remains PWA-only; OneSignal support depends on the configured Safari/web push setup.
