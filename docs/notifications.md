# Notification delivery

InstaScore owns notification rules, recipients and delivery history. OneSignal is the transport.

## Runtime flow

1. A scoring or fixture service commits its database transaction.
2. `NotificationDispatcher` inserts an idempotent row in `notification_jobs`.
3. `NotificationScheduler` runs the queue worker every minute and the starting-reminder scan every five minutes.
4. `NotificationJobRepository` resolves active subscriptions, team/competition follows, category preferences and quiet hours.
5. `OneSignalAdapter` sends one external-ID request with a stable idempotency key, collapse key, deep link and category-appropriate TTL.
6. The job and per-recipient delivery logs are marked sent, suppressed, retrying or failed.

The worker retries transient failures up to five times with exponential backoff. The OneSignal REST key remains server-only. Disabling notifications in operations settings suppresses delivery immediately.

## Automated events

- Match starting in roughly 15 minutes.
- Match status changed to live.
- Positive scoring event.
- Final score when a fixture becomes completed or confirmed.
- Fixture kickoff, venue or status change.

Duplicate hooks are safe because the queue has a unique event/category/collapse constraint and OneSignal receives a stable idempotency key.

## Production scheduling

WP-Cron registers `instascore_notification_worker` and `instascore_notification_reminders`. Production must invoke `wp-cron.php` every minute using the server cron already documented in `DEPLOYMENT.md`; normal visitor traffic must not be the only scheduler trigger.

## Administration

The notification administration screen shows configuration state, active subscriptions, queue counts and next cron runs. Administrators can run the worker immediately and send a controlled test notification. Recent delivery failures remain visible in Operations.

## Device onboarding

Permission is requested only from a user action. iPhone and iPad users are guided to install the PWA and reopen it from the Home Screen before the notification button is enabled. Successful subscriptions are linked to the signed-in InstaScore UUID and persisted in the local database.
