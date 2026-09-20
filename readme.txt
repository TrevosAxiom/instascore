=== InstaScore Platform ===
Contributors: instascore
Requires at least: 6.6
Requires PHP: 8.2
Stable tag: 0.23.0-rc.2
License: GPL-2.0-or-later

WordPress backend and React application shell for InstaScore.

== Installation ==

See README.md for the shortcode, development server and production build steps.

== Changelog ==

= 0.23.0-rc.2 =
* Completed database-first reliability, polling recovery, diagnostics and permanent match history.
* Added sport-specific match centres, officials controls, competition formats, fixture generation and playoffs.
* Added team-manager self-service, roster approvals, player profiles and role-specific workspaces.
* Completed favourites, notifications, match banter, newsroom discovery and fantasy operations.
* Added Veo/YouTube broadcast operations, replay library, sponsorship campaigns and audience reporting.
* Added production preflight, recovery manifests, security headers, accessibility baselines and performance budgets.
* Added supporter memberships, match tickets, ticket redemption, merchandise, inventory, fulfilment and revenue reporting.

= 0.22.3 =
* Routed direct soccer and NFL match-detail URLs through the InstaScore application instead of the WordPress 404 template.
* Added database-first historical match recovery with an allow-listed provider fallback for older completed matches.
* Cached recovered match records so subsequent match-detail requests do not repeat provider calls.

= 0.22.2 =
* Corrected homepage Next Fixtures to select the earliest future matches across the next 30 days.
* Refreshed current match-day provider caches on the live interval instead of retaining stale scheduled states.
* Removed elapsed kickoffs from Upcoming and added consistent FT markers for completed and confirmed matches.

= 0.22.1 =
* Added native InstaScore article pages with the application header, navigation, themes, footer and responsive PWA layout.
* Routed homepage and archive story links through the application instead of the active WordPress theme.
* Preserved original publisher links separately for imported RSS stories.

= 0.22.0 =
* Added API-American-Football support for NFL competitions, teams, players, fixtures, standings and statistics.
* Added configured competition-ID allow-lists and database-first provider catalogues across soccer, basketball and NFL.
* Added NFL match centres and corrected sport-specific fixture links.
* Repaired live polling, NFL live-state mapping and immediate provider schedule reconciliation.
* Improved homepage news readability, missing-image fallbacks and RSS entity decoding.

= 0.21.0 =
* Added role-specific workspace navigation and dashboards for administrators, managers and officials.
* Added fixture CSV import with a downloadable sample template.

= 0.20.2 =
* Fixed a WordPress Plugins screen fatal when core passes a null forced-auto-update state.
* Added the responsive flag-football fantasy lineup pitch and squad controls.

= 0.20.1 =
* Corrected strict production type validation for provider-backed table selections.

= 0.20.0 =
* Removed stale homepage and live-score records by enforcing current date, status and kickoff windows.
* Rebuilt Scores, Fixtures and Results with match-day navigation and competition-grouped listings.
* Added database-first public soccer and basketball competition catalogues and standings with allow-listed provider fallback.
* Expanded the Competition directory and Tables page across flag football, soccer and basketball.

= 0.19.1 =
* Repaired the GitHub release packaging workflow so installable plugin ZIP files publish reliably.

= 0.19.0 =
* Added the complete CFFL fantasy foundation, scoring, transfers, leagues and administration workflows.
* Added YouTube/Veo livestream management, live control room, match overlays, sponsor analytics and notifications.
* Added fixture banter with replies, reactions, reporting, moderation and temporary match-room mutes.
* Repaired database-first live-score polling and removed stale HTTP and PWA cache interference.
* Added role-aware dashboards for administrators, competition managers, teams, scorekeepers, officials and fans.
* Improved the installed-PWA splash sequence, startup feedback and reduced-motion support.

= 0.18.3 =
* Redesigned the homepage sports-news experience with an All view.
* Added automatic WordPress updates from published stable and release-candidate GitHub releases.

= 0.18.2 =
* Added the complete paginated news archive, RSS CSV administration, OneSignal settings, and default sports news feeds.

= 0.18.1 =
* Unreleased build superseded by 0.18.2.

= 0.18.0 =
* Repaired direct SPA routing, replaced demonstration data, and redesigned public and administration workflows for production usability.

= 0.1.0 =
* Added plugin lifecycle, versioned migrations, REST foundation and React shell.
