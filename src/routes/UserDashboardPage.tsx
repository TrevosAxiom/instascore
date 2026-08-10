import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../api/context';
import { useAuth } from '../app/auth-context';
import { ErrorState, LoadingState } from '../components/AsyncStates';
import { PageScaffold } from '../components/PageScaffold';
import { FixtureCards } from '../features/fixtures/FixtureCards';
import type { AuthUser } from '../types/api';

type Persona = 'administrator' | 'competition' | 'team' | 'scorekeeper' | 'official' | 'fan';

const personaContent: Record<Persona, { label: string; description: string }> = {
  administrator: {
    label: 'League command centre',
    description: 'Platform readiness, match operations and the work that needs attention today.',
  },
  competition: {
    label: 'Competition workspace',
    description: 'Keep competitions, teams, schedules and results ready for supporters.',
  },
  team: {
    label: 'Team workspace',
    description: 'Manage your roster and stay ahead of upcoming fixtures.',
  },
  scorekeeper: {
    label: 'Match-day console',
    description: 'Find the next match, open scoring controls and keep live data moving.',
  },
  official: {
    label: 'Official dashboard',
    description: 'Review today’s schedule and prepare for your next assignment.',
  },
  fan: {
    label: 'Your match-day home',
    description: 'Live matches, favourite teams and the fixtures you care about.',
  },
};

function personaFor(roles: string[], capabilities?: AuthUser['capabilities']): Persona {
  if (!capabilities) return 'fan';
  if (capabilities.manageLeagues || capabilities.manageUsers) return 'administrator';
  if (capabilities.manageCompetitions || capabilities.manageFixtures) return 'competition';
  if (capabilities.manageTeams || capabilities.managePlayers) return 'team';
  if (capabilities.manageScoring || roles.includes('instascore_scorekeeper')) return 'scorekeeper';
  if (roles.includes('instascore_match_official')) return 'official';
  return 'fan';
}

export function UserDashboardPage() {
  const api = useApi();
  const { state } = useAuth();
  const user = state?.user;
  const persona = personaFor(user?.roles ?? [], user?.capabilities);
  const content = personaContent[persona];
  const fixtures = useQuery({
    queryKey: ['user-dashboard', 'fixtures', persona],
    queryFn: () =>
      user?.capabilities.manageFixtures
        ? api.getAdminFixtures(new URLSearchParams({ per_page: '50' }))
        : api.getFixtures(new URLSearchParams({ per_page: '50' })),
  });
  const teams = useQuery({
    queryKey: ['user-dashboard', 'teams'],
    queryFn: () => api.getTeams(new URLSearchParams({ per_page: '50' })),
    enabled: persona !== 'fan',
  });
  const players = useQuery({
    queryKey: ['user-dashboard', 'players'],
    queryFn: () => api.getPlayers(new URLSearchParams({ per_page: '50' })),
    enabled: persona !== 'fan',
  });
  const competitions = useQuery({
    queryKey: ['user-dashboard', 'competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
    enabled: ['administrator', 'competition'].includes(persona),
  });
  const feed = useQuery({
    queryKey: ['user-dashboard', 'feed'],
    queryFn: api.getPersonalFeed,
    enabled: persona === 'fan',
  });
  const matches = fixtures.data?.items ?? [];
  const live = matches.filter((item) =>
    ['warmup', 'live', 'halftime', 'interval'].includes(item.status),
  );
  const upcoming = matches.filter((item) =>
    ['draft', 'scheduled', 'postponed'].includes(item.status),
  );
  const today = matches.filter(
    (item) =>
      new Date(item.kickoffAt.replace(' ', 'T') + 'Z').toDateString() === new Date().toDateString(),
  );
  const missingVenues = upcoming.filter((item) => !item.venue).length;
  const metrics =
    persona === 'fan'
      ? [
          ['Live now', live.length],
          ['Following', feed.data?.favourites.length ?? 0],
          ['Upcoming', upcoming.length],
          ['Suggestions', feed.data?.suggestions.length ?? 0],
        ]
      : persona === 'scorekeeper' || persona === 'official'
        ? [
            ['Today', today.length],
            ['Live now', live.length],
            ['Upcoming', upcoming.length],
            [
              'Completed',
              matches.filter((item) => ['completed', 'confirmed'].includes(item.status)).length,
            ],
          ]
        : [
            ['Competitions', competitions.data?.total ?? 0],
            ['Teams', teams.data?.total ?? 0],
            ['Players', players.data?.total ?? 0],
            ['Fixtures', fixtures.data?.total ?? 0],
          ];
  const actions = [
    ['Follow teams', '/favourites', true],
    ['Notification settings', '/notifications', true],
    ['Install the app', '/install', true],
    ['Manage competitions', '/admin/competitions', !!user?.capabilities.manageCompetitions],
    [
      'Manage teams & rosters',
      '/admin/teams',
      !!(user?.capabilities.manageTeams || user?.capabilities.managePlayers),
    ],
    ['Open fixture manager', '/admin/fixtures', !!user?.capabilities.manageFixtures],
    ['Open live operations', '/operations', !!user?.capabilities.accessOperations],
    ['Manage accounts', '/admin/accounts', !!user?.capabilities.manageUsers],
  ].filter((item) => item[2]) as [string, string, boolean][];
  const readiness =
    persona === 'administrator' || persona === 'competition'
      ? ([
          ['Competition created', (competitions.data?.total ?? 0) > 0],
          ['Teams registered', (teams.data?.total ?? 0) > 1],
          ['Players registered', (players.data?.total ?? 0) > 0],
          ['Fixtures published', matches.some((item) => item.status !== 'draft')],
        ] as const)
      : [];
  const readinessCount = readiness.filter((item) => item[1]).length;

  if (!user) return <LoadingState label="Loading your dashboard" />;
  if (fixtures.isLoading) return <LoadingState label="Loading today’s activity" />;
  return (
    <PageScaffold
      eyebrow={content.label}
      title={`Welcome back, ${user.displayName}`}
      description={content.description}
      status={
        user.roles
          .map((role) => role.replace('instascore_', '').replaceAll('_', ' '))
          .join(' · ') || 'Fan'
      }
    >
      {!navigator.onLine && (
        <Alert severity="warning">
          You are offline. Recent schedules and scores are available from the app cache.
        </Alert>
      )}
      {fixtures.isError && <ErrorState title="Today’s match activity could not be loaded." />}
      <Grid container spacing={1.5}>
        {metrics.map(([label, value]) => (
          <Grid key={label} size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h4" fontWeight={950}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {(persona === 'administrator' || persona === 'competition') && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
                <div>
                  <Typography variant="h6" fontWeight={950}>
                    Competition readiness
                  </Typography>
                  <Typography color="text.secondary">
                    Complete the essentials before promoting the next match day.
                  </Typography>
                </div>
                <Chip
                  label={`${readinessCount}/${readiness.length} ready`}
                  color={readinessCount === readiness.length ? 'success' : 'primary'}
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(readinessCount / readiness.length) * 100}
              />
              <Grid container spacing={1}>
                {readiness.map(([label, complete]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Box
                      sx={{
                        p: 1.25,
                        bgcolor: complete ? 'success.light' : 'action.hover',
                        color: complete ? 'success.contrastText' : 'text.primary',
                      }}
                    >
                      {complete ? '✓' : '○'} {label}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {missingVenues > 0 && (
                <Alert severity="warning">
                  {missingVenues} upcoming fixture{missingVenues === 1 ? '' : 's'} still need a
                  venue.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" color="primary.main" fontWeight={950}>
                  {live.length
                    ? 'Live now'
                    : persona === 'scorekeeper' || persona === 'official'
                      ? 'Your match queue'
                      : 'Coming up'}
                </Typography>
                <Typography variant="h5" fontWeight={950}>
                  {live.length ? 'Matches in progress' : 'Next fixtures'}
                </Typography>
              </Box>
              <Button component={RouterLink} to="/fixtures">
                Full schedule
              </Button>
            </Stack>
            <FixtureCards
              fixtures={(live.length
                ? live
                : persona === 'scorekeeper' || persona === 'official'
                  ? today
                  : upcoming
              ).slice(0, 5)}
            />
            {!live.length && !upcoming.length && (
              <Alert severity="info">No upcoming fixtures have been published yet.</Alert>
            )}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%', bgcolor: '#07192d', color: '#fff5d6' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={950}>
                Quick actions
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {actions.map(([label, path]) => (
                  <Button
                    key={path}
                    component={RouterLink}
                    to={path}
                    variant="outlined"
                    sx={{
                      justifyContent: 'flex-start',
                      color: '#fff5d6',
                      borderColor: 'rgba(255,245,214,.35)',
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {persona === 'fan' && (
        <Grid container spacing={1.5}>
          {(feed.data?.suggestions ?? []).slice(0, 3).map((suggestion) => (
            <Grid key={`${suggestion.type}-${suggestion.label}`} size={{ xs: 12, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="primary.main">
                    Suggested for you
                  </Typography>
                  <Typography variant="h6" fontWeight={950}>
                    {suggestion.label}
                  </Typography>
                  <Button component={RouterLink} to="/favourites" sx={{ mt: 1 }}>
                    Personalise feed
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </PageScaffold>
  );
}
