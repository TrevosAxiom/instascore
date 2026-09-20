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

type DashboardPersona =
  'administrator' | 'competition' | 'team' | 'scorekeeper' | 'official' | 'fan';

const personaContent: Record<
  DashboardPersona,
  { label: string; description: string; focus: string; accent: string }
> = {
  administrator: {
    label: 'League command centre',
    description: 'Platform readiness, match operations and the work that needs attention today.',
    focus: 'Run the platform',
    accent: '#f3c643',
  },
  competition: {
    label: 'Competition workspace',
    description: 'Keep competitions, teams, schedules and results ready for supporters.',
    focus: 'Prepare match day',
    accent: '#63c7ff',
  },
  team: {
    label: 'Team workspace',
    description: 'Manage your roster and stay ahead of upcoming fixtures.',
    focus: 'Manage the squad',
    accent: '#72df9b',
  },
  scorekeeper: {
    label: 'Match-day console',
    description: 'Find the next match, open scoring controls and keep live data moving.',
    focus: 'Operate live matches',
    accent: '#ff8a65',
  },
  official: {
    label: 'Official dashboard',
    description: 'Review today’s schedule and prepare for your next assignment.',
    focus: 'Complete match duties',
    accent: '#b6a1ff',
  },
  fan: {
    label: 'Your match-day home',
    description: 'Live matches, favourite teams and the fixtures you care about.',
    focus: 'Follow the action',
    accent: '#f3c643',
  },
};

function personaFor(roles: string[], capabilities?: AuthUser['capabilities']): DashboardPersona {
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
    ['Follow teams', '/favourites', true, 'star'],
    ['Notification settings', '/notifications', true, 'bell'],
    ['Install the app', '/install', true, 'phone'],
    [
      'Manage competitions',
      '/admin/competitions',
      !!user?.capabilities.manageCompetitions,
      'trophy',
    ],
    [
      'Manage teams & rosters',
      '/admin/teams',
      !!(user?.capabilities.manageTeams || user?.capabilities.managePlayers),
      'team',
    ],
    ['Open fixture manager', '/admin/fixtures', !!user?.capabilities.manageFixtures, 'calendar'],
    ['Open live operations', '/operations', !!user?.capabilities.accessOperations, 'pulse'],
    ['Manage accounts', '/admin/accounts', !!user?.capabilities.manageUsers, 'users'],
  ].filter((item) => item[2]) as [string, string, boolean, DashboardGlyphName][];
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
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 3, md: 5 },
          color: '#fff',
          background: 'linear-gradient(125deg, rgb(7,25,45) 0%, rgb(10,48,78) 100%)',
          boxShadow: '0 24px 60px rgba(7,25,45,.18)',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 240,
            height: 240,
            right: -70,
            top: -110,
            borderRadius: '50%',
            border: `42px solid ${content.accent}22`,
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          gap={2}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Stack spacing={1}>
            <Chip
              label={content.focus}
              size="small"
              sx={{
                alignSelf: 'flex-start',
                bgcolor: content.accent,
                color: '#07192d',
                fontWeight: 950,
              }}
            />
            <Typography variant="h5" fontWeight={950}>
              {dashboardHeadline(persona, live.length, today.length)}
            </Typography>
            <Typography sx={{ maxWidth: 650, color: 'rgba(255,255,255,.72)' }}>
              {dashboardBrief(persona, missingVenues, upcoming.length)}
            </Typography>
          </Stack>
          <Button
            component={RouterLink}
            to={primaryAction(persona).path}
            variant="contained"
            size="large"
            sx={{
              bgcolor: content.accent,
              color: '#07192d',
              flexShrink: 0,
              '&:hover': { bgcolor: content.accent },
            }}
          >
            {primaryAction(persona).label}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={1.5}>
        {metrics.map(([label, value]) => (
          <Grid key={String(label)} size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="overline" color="text.secondary" fontWeight={850}>
                      {label}
                    </Typography>
                    <Typography variant="h4" fontWeight={950}>
                      {value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      color: content.accent,
                      bgcolor: 'rgb(7 25 45)',
                      p: 0.75,
                      borderRadius: 2,
                    }}
                  >
                    <DashboardGlyph name={metricGlyph(String(label))} />
                  </Box>
                </Stack>
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
          <Stack spacing={1.25}>
            <Typography variant="h6" fontWeight={950}>
              Your tools
            </Typography>
            {actions.slice(0, 6).map(([label, path, , glyph]) => (
              <Card
                key={path}
                component={RouterLink}
                to={path}
                aria-label={label}
                variant="outlined"
                sx={{
                  color: 'text.primary',
                  textDecoration: 'none',
                  borderRadius: 3,
                  transition: 'transform .18s ease, border-color .18s ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: content.accent },
                }}
              >
                <CardContent
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: '12px !important' }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: '#07192d',
                      color: content.accent,
                    }}
                  >
                    <DashboardGlyph name={glyph} />
                  </Box>
                  <Typography fontWeight={900} sx={{ flex: 1 }}>
                    {label}
                  </Typography>
                  <Typography color="text.secondary">›</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
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
                  <Button
                    component={RouterLink}
                    to={suggestion.url ?? '/favourites'}
                    sx={{ mt: 1 }}
                  >
                    Explore
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

type DashboardGlyphName =
  'pulse' | 'calendar' | 'team' | 'trophy' | 'users' | 'bell' | 'star' | 'phone';

function DashboardGlyph({ name }: { name: DashboardGlyphName }) {
  const paths: Record<DashboardGlyphName, string> = {
    pulse: 'M3 12h4l2-6 4 12 2-6h6',
    calendar: 'M5 5h14v15H5zM8 3v4m8-4v4M5 9h14',
    team: 'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21c0-4 2-7 6-7s6 3 6 7m1-7c4 0 7 2 7 6',
    trophy: 'M8 4h8v5c0 4-2 6-4 6s-4-2-4-6V4Zm0 2H4c0 4 2 6 5 6m7-6h4c0 4-2 6-5 6m-3 3v5m-4 0h8',
    users:
      'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1a3 3 0 1 0 0-6M2 21c0-5 3-8 7-8s7 3 7 8m0-7c4 0 6 2 6 6',
    bell: 'M6 17h12l-2-3V9a4 4 0 0 0-8 0v5l-2 3Zm4 3h4',
    star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
    phone: 'M7 2h10v20H7zM10 18h4',
  };
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 22, height: 22 }} aria-hidden="true">
      <path
        d={paths[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

function metricGlyph(label: string): DashboardGlyphName {
  if (/live/i.test(label)) return 'pulse';
  if (/team|following/i.test(label)) return 'team';
  if (/player/i.test(label)) return 'users';
  if (/competition/i.test(label)) return 'trophy';
  return 'calendar';
}

function primaryAction(persona: DashboardPersona) {
  if (persona === 'administrator') return { label: 'Open admin centre', path: '/admin' };
  if (persona === 'competition') return { label: 'Manage fixtures', path: '/admin/fixtures' };
  if (persona === 'team') return { label: 'Open team & roster', path: '/admin/teams' };
  if (persona === 'scorekeeper') return { label: 'Open match operations', path: '/match-day' };
  if (persona === 'official') return { label: 'View today’s fixtures', path: '/match-day' };
  return { label: 'Open live scores', path: '/scores' };
}

function dashboardHeadline(persona: DashboardPersona, live: number, today: number) {
  if (live > 0) return `${live} match${live === 1 ? '' : 'es'} live right now`;
  if (persona === 'scorekeeper')
    return today
      ? `${today} match-day task${today === 1 ? '' : 's'} today`
      : 'Scoring desk is clear';
  if (persona === 'official')
    return today
      ? `${today} fixture${today === 1 ? '' : 's'} on today’s board`
      : 'No match duties today';
  if (persona === 'team') return 'Your squad and schedule at a glance';
  if (persona === 'fan') return 'Everything you follow, in one place';
  return 'Your league is ready for action';
}

function dashboardBrief(persona: DashboardPersona, missingVenues: number, upcoming: number) {
  if ((persona === 'administrator' || persona === 'competition') && missingVenues > 0)
    return `${missingVenues} upcoming fixture${missingVenues === 1 ? '' : 's'} still require a venue. Resolve them before match day.`;
  if (persona === 'scorekeeper')
    return 'Claim an assigned fixture, confirm the teams, then open the live scoring console.';
  if (persona === 'official')
    return 'Check kickoff details, venue and match information before heading to the field.';
  if (persona === 'team')
    return `${upcoming} upcoming fixture${upcoming === 1 ? '' : 's'} currently published for your workspace.`;
  if (persona === 'fan')
    return 'Jump into live scores, banter, fantasy and news without hunting through menus.';
  return `${upcoming} upcoming fixture${upcoming === 1 ? '' : 's'} are currently published across the platform.`;
}
