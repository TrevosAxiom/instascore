# Roles and capabilities

| Role                    | Access                                                    |
| ----------------------- | --------------------------------------------------------- |
| WordPress Administrator | Admin/operations shells and global league/team management |
| League Administrator    | Global league, competition, team and roster management    |
| Competition Manager     | Admin shell and assigned competition management           |
| Team Administrator      | Assigned team and registration management                 |

Capabilities are `instascore_access_admin`, `instascore_access_operations`,
`instascore_manage_leagues`, `instascore_manage_competitions`,
`instascore_manage_teams`, `instascore_manage_players`,
`instascore_manage_venues`, `instascore_manage_officials` and
`instascore_manage_fixtures`, `instascore_manage_scoring` and
`instascore_confirm_results`.

Competition Manager scope is stored as competition UUIDs in
`instascore_competition_assignments` user meta.

Team Administrator scope is stored as team UUIDs in
`instascore_team_assignments` user meta. Team administrators may manage only
assigned teams and registrations for assigned teams. League administrators can
manage all team, player, venue and official records.

React guards are navigation controls; server REST permission callbacks are
authoritative.

Fixture mutations require `instascore_manage_fixtures` or an existing league /
competition-management capability. Public fixture and result reads require no
authentication and expose UUIDs only.

Scorekeepers receive `instascore_access_operations` and
`instascore_manage_scoring`, but scoring service scope still requires an active
assignment to the requested fixture unless the user also has fixture,
competition or league management authority. Commissioners use
`instascore_confirm_results` to confirm provisional results.
