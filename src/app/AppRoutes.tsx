import { Route, Routes } from 'react-router';
import { lazy, Suspense, type ReactNode } from 'react';

import { AppShell } from '../components/AppShell';
import { LoadingState } from '../components/AsyncStates';
import { PageScaffold } from '../components/PageScaffold';
import { HomePage } from '../routes/HomePage';
import { LoginPage } from '../routes/LoginPage';
import { InstallAppPage } from '../routes/InstallAppPage';
import { RequireAuth } from '../routes/RequireAuth';
import { UserDashboardPage } from '../routes/UserDashboardPage';
import { MorePage } from '../routes/MorePage';
import { ContactPage } from '../routes/ContactPage';
import { PlaceholderPage } from '../routes/PlaceholderPages';
import { RequireCapability } from '../routes/RequireCapability';

const AdminDashboardPage = lazy(() =>
  import('../features/admin/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import('../features/admin/AdminSettingsPage').then((module) => ({
    default: module.AdminSettingsPage,
  })),
);
const AdminRssPage = lazy(() =>
  import('../features/news/AdminRssPage').then((module) => ({ default: module.AdminRssPage })),
);
const AdminAccountsPage = lazy(() =>
  import('../features/admin/AdminAccountsPage').then((module) => ({
    default: module.AdminAccountsPage,
  })),
);
const BasketballLivePage = lazy(() =>
  import('../features/basketball/BasketballLivePage').then((module) => ({
    default: module.BasketballLivePage,
  })),
);
const BasketballMatchDetailPage = lazy(() =>
  import('../features/basketball/BasketballMatchDetailPage').then((module) => ({
    default: module.BasketballMatchDetailPage,
  })),
);
const AdminCompetitionsPage = lazy(() =>
  import('../features/competitions/AdminCompetitionsPage').then((module) => ({
    default: module.AdminCompetitionsPage,
  })),
);
const CompetitionDetailPage = lazy(() =>
  import('../features/competitions/CompetitionDetailPage').then((module) => ({
    default: module.CompetitionDetailPage,
  })),
);
const CompetitionDirectoryPage = lazy(() =>
  import('../features/competitions/CompetitionDirectoryPage').then((module) => ({
    default: module.CompetitionDirectoryPage,
  })),
);
const CompetitionPortalPage = lazy(() =>
  import('../features/portals/CompetitionPortalPage').then((module) => ({
    default: module.CompetitionPortalPage,
  })),
);
const FixtureWidgetPage = lazy(() =>
  import('../features/widgets/FixtureWidgetPage').then((module) => ({
    default: module.FixtureWidgetPage,
  })),
);
const LiveScoreWidgetPage = lazy(() =>
  import('../features/widgets/LiveScoreWidgetPage').then((module) => ({
    default: module.LiveScoreWidgetPage,
  })),
);
const TableWidgetPage = lazy(() =>
  import('../features/widgets/TableWidgetPage').then((module) => ({
    default: module.TableWidgetPage,
  })),
);
const AdminFixturesPage = lazy(() =>
  import('../features/fixtures/AdminFixturesPage').then((module) => ({
    default: module.AdminFixturesPage,
  })),
);
const FixtureDetailPage = lazy(() =>
  import('../features/fixtures/FixtureDetailPage').then((module) => ({
    default: module.FixtureDetailPage,
  })),
);
const FootballMatchDetailPage = lazy(() =>
  import('../features/fixtures/FootballMatchDetailPage').then((module) => ({
    default: module.FootballMatchDetailPage,
  })),
);
const FixtureListPage = lazy(() =>
  import('../features/fixtures/FixtureListPage').then((module) => ({
    default: module.FixtureListPage,
  })),
);
const ResultsPage = lazy(() =>
  import('../features/fixtures/ResultsPage').then((module) => ({ default: module.ResultsPage })),
);
const AdminFantasyPage = lazy(() =>
  import('../features/fantasy/AdminFantasyPage').then((module) => ({
    default: module.AdminFantasyPage,
  })),
);
const FantasyDashboardPage = lazy(() =>
  import('../features/fantasy/FantasyDashboardPage').then((module) => ({
    default: module.FantasyDashboardPage,
  })),
);
const FantasyLeaguePage = lazy(() =>
  import('../features/fantasy/FantasyLeaguePage').then((module) => ({
    default: module.FantasyLeaguePage,
  })),
);
const FantasyPointsPage = lazy(() =>
  import('../features/fantasy/FantasyPointsPage').then((module) => ({
    default: module.FantasyPointsPage,
  })),
);
const FantasyTransfersPage = lazy(() =>
  import('../features/fantasy/FantasyTransfersPage').then((module) => ({
    default: module.FantasyTransfersPage,
  })),
);
const FavouritesPage = lazy(() =>
  import('../features/favourites/FavouritesPage').then((module) => ({
    default: module.FavouritesPage,
  })),
);
const PlayerDirectoryPage = lazy(() =>
  import('../features/players/PlayerDirectoryPage').then((module) => ({
    default: module.PlayerDirectoryPage,
  })),
);
const PlayerProfilePage = lazy(() =>
  import('../features/players/PlayerProfilePage').then((module) => ({
    default: module.PlayerProfilePage,
  })),
);
const AdminProvidersPage = lazy(() =>
  import('../features/providers/AdminProvidersPage').then((module) => ({
    default: module.AdminProvidersPage,
  })),
);
const ScorekeeperControlsPage = lazy(() =>
  import('../features/scoring/ScorekeeperControlsPage').then((module) => ({
    default: module.ScorekeeperControlsPage,
  })),
);
const SearchPage = lazy(() =>
  import('../features/search/SearchPage').then((module) => ({ default: module.SearchPage })),
);
const DisciplineAdminPage = lazy(() =>
  import('../features/discipline/DisciplineAdminPage').then((module) => ({
    default: module.DisciplineAdminPage,
  })),
);
const AdminNotificationTestPage = lazy(() =>
  import('../features/notifications/AdminNotificationTestPage').then((module) => ({
    default: module.AdminNotificationTestPage,
  })),
);
const NotificationPreferencesPage = lazy(() =>
  import('../features/notifications/NotificationPreferencesPage').then((module) => ({
    default: module.NotificationPreferencesPage,
  })),
);
const OperationsDashboardPage = lazy(() =>
  import('../features/operations/OperationsDashboardPage').then((module) => ({
    default: module.OperationsDashboardPage,
  })),
);
const LeagueTablePage = lazy(() =>
  import('../features/standings/LeagueTablePage').then((module) => ({
    default: module.LeagueTablePage,
  })),
);
const PlayerLeadersPage = lazy(() =>
  import('../features/standings/StatisticsPages').then((module) => ({
    default: module.PlayerLeadersPage,
  })),
);
const TeamStatisticsPage = lazy(() =>
  import('../features/standings/StatisticsPages').then((module) => ({
    default: module.TeamStatisticsPage,
  })),
);
const AdminTeamsPage = lazy(() =>
  import('../features/teams/AdminTeamsPage').then((module) => ({ default: module.AdminTeamsPage })),
);
const TeamDirectoryPage = lazy(() =>
  import('../features/teams/TeamDirectoryPage').then((module) => ({
    default: module.TeamDirectoryPage,
  })),
);
const TeamProfilePage = lazy(() =>
  import('../features/teams/TeamProfilePage').then((module) => ({
    default: module.TeamProfilePage,
  })),
);

function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState label="Loading route" />}>{children}</Suspense>;
}

export function AppRoutes(props: { loginUrl: string }) {
  void props;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route
          path="scores"
          element={
            <RouteSuspense>
              <FixtureListPage mode="scores" />
            </RouteSuspense>
          }
        />
        <Route
          path="fixtures"
          element={
            <RouteSuspense>
              <FixtureListPage />
            </RouteSuspense>
          }
        />
        <Route
          path="fixtures/:uuid"
          element={
            <RouteSuspense>
              <FixtureDetailPage />
            </RouteSuspense>
          }
        />
        <Route
          path="football/matches/:providerId"
          element={
            <RouteSuspense>
              <FootballMatchDetailPage />
            </RouteSuspense>
          }
        />
        <Route
          path="results"
          element={
            <RouteSuspense>
              <ResultsPage />
            </RouteSuspense>
          }
        />
        <Route
          path="basketball"
          element={
            <RouteSuspense>
              <BasketballLivePage />
            </RouteSuspense>
          }
        />
        <Route
          path="basketball/matches/:providerId"
          element={
            <RouteSuspense>
              <BasketballMatchDetailPage />
            </RouteSuspense>
          }
        />
        <Route
          path="favourites"
          element={
            <RouteSuspense>
              <FavouritesPage />
            </RouteSuspense>
          }
        />
        <Route
          path="search"
          element={
            <RouteSuspense>
              <SearchPage />
            </RouteSuspense>
          }
        />
        <Route
          path="competitions"
          element={
            <RouteSuspense>
              <CompetitionDirectoryPage />
            </RouteSuspense>
          }
        />
        <Route
          path="competitions/:uuid"
          element={
            <RouteSuspense>
              <CompetitionDetailPage />
            </RouteSuspense>
          }
        />
        <Route
          path="portal/:competitionUuid"
          element={
            <RouteSuspense>
              <CompetitionPortalPage />
            </RouteSuspense>
          }
        />
        <Route
          path="embed/live/:uuid"
          element={
            <RouteSuspense>
              <LiveScoreWidgetPage />
            </RouteSuspense>
          }
        />
        <Route
          path="embed/fixture/:uuid"
          element={
            <RouteSuspense>
              <FixtureWidgetPage />
            </RouteSuspense>
          }
        />
        <Route
          path="embed/table/:competitionUuid"
          element={
            <RouteSuspense>
              <TableWidgetPage />
            </RouteSuspense>
          }
        />
        <Route
          path="teams"
          element={
            <RouteSuspense>
              <TeamDirectoryPage />
            </RouteSuspense>
          }
        />
        <Route
          path="teams/:uuid"
          element={
            <RouteSuspense>
              <TeamProfilePage />
            </RouteSuspense>
          }
        />
        <Route
          path="standings"
          element={
            <RouteSuspense>
              <LeagueTablePage />
            </RouteSuspense>
          }
        />
        <Route
          path="players/leaders"
          element={
            <RouteSuspense>
              <PlayerLeadersPage />
            </RouteSuspense>
          }
        />
        <Route
          path="players"
          element={
            <RouteSuspense>
              <PlayerDirectoryPage />
            </RouteSuspense>
          }
        />
        <Route
          path="players/:uuid"
          element={
            <RouteSuspense>
              <PlayerProfilePage />
            </RouteSuspense>
          }
        />
        <Route
          path="teams/:uuid/statistics"
          element={
            <RouteSuspense>
              <TeamStatisticsPage />
            </RouteSuspense>
          }
        />
        <Route
          path="fantasy"
          element={
            <RouteSuspense>
              <FantasyDashboardPage />
            </RouteSuspense>
          }
        />
        <Route
          path="fantasy/points"
          element={
            <RouteSuspense>
              <FantasyPointsPage />
            </RouteSuspense>
          }
        />
        <Route
          path="fantasy/transfers"
          element={
            <RouteSuspense>
              <FantasyTransfersPage />
            </RouteSuspense>
          }
        />
        <Route
          path="fantasy/leagues/:uuid"
          element={
            <RouteSuspense>
              <FantasyLeaguePage />
            </RouteSuspense>
          }
        />
        <Route path="news" element={<PlaceholderPage page="news" />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="notifications" element={<NotificationPreferencesPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="install" element={<InstallAppPage />} />
        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<UserDashboardPage />} />
        </Route>
        <Route element={<RequireCapability capability="accessAdmin" />}>
          <Route
            path="admin"
            element={
              <RouteSuspense>
                <AdminDashboardPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/competitions"
            element={
              <RouteSuspense>
                <AdminCompetitionsPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/teams"
            element={
              <RouteSuspense>
                <AdminTeamsPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/accounts"
            element={
              <RouteSuspense>
                <AdminAccountsPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/fixtures"
            element={
              <RouteSuspense>
                <AdminFixturesPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/fantasy"
            element={
              <RouteSuspense>
                <AdminFantasyPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/discipline"
            element={
              <RouteSuspense>
                <DisciplineAdminPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/notifications"
            element={
              <RouteSuspense>
                <AdminNotificationTestPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/providers"
            element={
              <RouteSuspense>
                <AdminProvidersPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/rss"
            element={
              <RouteSuspense>
                <AdminRssPage />
              </RouteSuspense>
            }
          />
          <Route
            path="admin/settings"
            element={
              <RouteSuspense>
                <AdminSettingsPage />
              </RouteSuspense>
            }
          />
        </Route>
        <Route element={<RequireCapability capability="accessOperations" />}>
          <Route
            path="operations"
            element={
              <RouteSuspense>
                <OperationsDashboardPage />
              </RouteSuspense>
            }
          />
          <Route
            path="operations/fixtures/:uuid"
            element={
              <RouteSuspense>
                <ScorekeeperControlsPage />
              </RouteSuspense>
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <PageScaffold
              eyebrow="404"
              title="Page not found"
              description="The requested InstaScore route does not exist."
              status="Not found"
            />
          }
        />
      </Route>
    </Routes>
  );
}
