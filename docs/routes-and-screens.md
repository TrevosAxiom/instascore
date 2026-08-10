# Route map and screen inventory

Milestone 2 replaces the competition and administration placeholders with a
public directory/detail/season selector and protected domain administration.

| Prototype screen       | Proposed route                               |            Milestone |
| ---------------------- | -------------------------------------------- | -------------------: |
| Live Scores            | `/scores`                                    | 1 shell / later data |
| Competitions           | `/competitions`                              |                    2 |
| CFFL Table             | `/competitions/:competitionId/standings`     |                    7 |
| Team Profile           | `/teams/:teamId`                             |                    3 |
| Player Profile         | `/players/:playerId`                         |                    3 |
| Playoffs               | `/competitions/:competitionId/bracket`       |                    4 |
| Match Centre           | `/fixtures/:fixtureId`                       |                  4–5 |
| Scorekeeper Control    | `/operations/fixtures/:fixtureId`            |                    5 |
| Add Touchdown          | `/operations/fixtures/:fixtureId/events/new` |                    5 |
| League Admin Dashboard | `/admin`                                     |                    2 |
| Teams Admin            | `/admin/teams`                               |                    3 |
| Add Player             | `/admin/players/new`                         |                    3 |
| Create Fixture         | `/admin/fixtures/new`                        |                    4 |
| My Fantasy Team        | `/fantasy`                                   |                   12 |
| Pick Squad             | `/fantasy/games/:gameId/squad`               |                   12 |
| Player Market          | `/fantasy/games/:gameId/players`             |                   12 |
| Live Fantasy Points    | `/fantasy/gameweeks/:gameweekId/live`        |                   13 |
| Fantasy League         | `/fantasy/leagues/:leagueId`                 |                   13 |
| Fantasy Settings       | `/admin/fantasy/games/:gameId`               |                   12 |
| Football Match         | `/fixtures/:fixtureId`                       |                    9 |
| Basketball Game        | `/fixtures/:fixtureId`                       |                   10 |
| API Connections        | `/admin/providers`                           |                 9–10 |

## Primary route tree

- Public: `/`, `/scores`, `/competitions`, `/fixtures/:fixtureId`,
  `/fixtures`, `/results`, `/teams/:teamId`, `/players/:playerId`,
  `/fantasy`, `/news`, `/more`.
- Account: `/login`, `/favourites`, `/notifications`, `/profile`,
  `/settings/theme`, `/settings/notifications`.
- Protected administration: `/admin/*`.
- Assignment-protected operations: `/operations/*`.
- Fallback: `*` with a route-aware not-found state.

`/admin` requires `instascore_access_admin`; `/operations` requires
`instascore_access_operations`. Guests are redirected to `/login`. Feature
screens use reusable empty states until their assigned milestones.

Implemented Milestone 2 routes:

- `/competitions`: paginated and searchable public directory.
- `/competitions/:uuid`: public detail and season selector.
- `/admin`: protected sports, competitions, rules, seasons, stages and groups.

Implemented Milestone 3 routes:

- `/teams`: public team directory.
- `/teams/:uuid`: public team profile shell.
- `/players`: public player directory.
- `/players/:uuid`: public player profile with registration history.
- `/admin/teams`: protected team, player, registration, venue, official and
  CSV import management.

Implemented Milestone 4 routes:

- `/scores` and `/fixtures`: public fixture list/day filter shell.
- `/results`: public completed fixture/result shell without scoring.
- `/fixtures/:uuid`: public match-centre shell with fixture metadata only.
- `/admin/fixtures`: protected fixture manager with list/calendar/day tabs,
  create form, UTC/local-time behavior and conflict warnings.

Implemented Milestone 5 routes:

- `/fixtures/:uuid`: public live match centre with polling scoreboard and
  timeline.
- `/operations/fixtures/:uuid`: protected mobile scorekeeper control screen.
