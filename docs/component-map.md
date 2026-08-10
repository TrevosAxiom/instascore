# Reusable component map

Milestone 2 adds query-backed directory/detail pages, catalog forms,
competition and season editors, filters, pagination and a season selector.

| Layer           | Components                                                                                  | Notes                                        |
| --------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Shell           | `AppShell`, `TopNavigation`, `BottomNavigation`, `PageHeader`                               | Responsive navigation and route outlet       |
| Selection       | `SportSelector`, `CompetitionSelector`, `SegmentedTabs`, `FilterPills`                      | URL-backed filters where appropriate         |
| Match           | `ScoreCard`, `TeamCrest`, `MatchStatusBadge`, `MatchClock`, `MatchTimeline`, `ScoreSummary` | Sport adapters supply labels/periods         |
| Identity        | `PlayerAvatar`, `TeamIdentity`, `PlayerIdentity`                                            | Accessible fallbacks for missing media       |
| Data            | `StandingsTable`, `DataTable`, `MetricCard`, `Pagination`                                   | Server pagination and semantic tables        |
| Forms           | `FormField`, `SelectField`, `DateTimeField`, `ConfirmationDialog`                           | React Hook Form + Zod                        |
| Feedback        | `EmptyState`, `SkeletonLoader`, `ErrorState`, `Toast`, `OfflineStatus`                      | Consistent recovery actions                  |
| Access          | `RoleProtectedRoute`, `PermissionGuard`                                                     | UI convenience; server remains authoritative |
| Future adapters | `InstallPwaPrompt`, `NotificationOptInCard`                                                 | Interfaces reserved; not built in M0         |

## Composition

Routes compose domain feature containers from these primitives. Shared
components accept view models, never raw provider responses. MUI theme tokens
own palette, spacing, typography, radii and state colours.

Implemented in Milestone 1: `AppShell`, desktop top navigation, mobile bottom
navigation, `PageScaffold`, `LoadingState`, `EmptyState`, `ErrorState`,
`ThemeToggle`, `ErrorBoundary` and `RequireCapability`. Match and data
components remain mapped but unimplemented.
