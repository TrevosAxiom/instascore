# Milestone 16 Readiness Checklist

Milestone 15 is ready for approval when the following are accepted:

- Full frontend checks and production build pass.
- High-severity dependency audit findings are resolved.
- Initial route bundle is measurably smaller through lazy loading.
- Live polling no longer runs in hidden tabs.
- Server-secret exposure checks are in place.
- REST permission callback guardrail test is in place.
- Live scoreboard exposes score changes through a screen-reader status region.
- Focus styles and touch targets are strengthened.

Recommended Milestone 16 focus:

- Run browser Lighthouse on `http://instascore.local/` with realistic throttling.
- Add PHP/Composer to the local environment and run PHPUnit/PHP lint.
- Add end-to-end keyboard navigation checks with Playwright.
- Add production Redis/object-cache smoke testing if the deployment will use Redis.
- Expand job batching tests with realistic provider and notification volumes.
