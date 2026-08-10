import { Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

const adminSections = [
  ['Competitions', '/admin/competitions', 'Sports, competitions, seasons and competition rules.'],
  ['Teams & Players', '/admin/teams', 'Teams, players, registrations, venues and officials.'],
  [
    'People & Access',
    '/admin/accounts',
    'Invite administrators, scorekeepers, officials and editors.',
  ],
  ['Fixtures', '/admin/fixtures', 'Scheduling, fixture status and result confirmation workflow.'],
  ['Fantasy', '/admin/fantasy', 'Fantasy game setup, player pools and scoring rules.'],
  [
    'Notifications',
    '/admin/notifications',
    'Push test-send, OneSignal worker checks and alert setup.',
  ],
  ['Providers', '/admin/providers', 'Football and basketball provider health, mapping and sync.'],
  [
    'Settings',
    '/admin/settings',
    'Feature flags, maintenance mode, retention and setup diagnostics.',
  ],
  [
    'Operations',
    '/operations',
    'Live control room, failed jobs, conflicts, exports and audit logs.',
  ],
] as const;

export function AdminDashboardPage() {
  const api = useApi();
  const query = useQuery({
    queryKey: ['operations-dashboard'],
    queryFn: api.getOperationsDashboard,
  });
  const teams = useQuery({ queryKey: ['admin-readiness', 'teams'], queryFn: () => api.getTeams() });
  const players = useQuery({
    queryKey: ['admin-readiness', 'players'],
    queryFn: () => api.getPlayers(),
  });
  const fixtures = useQuery({
    queryKey: ['admin-readiness', 'fixtures'],
    queryFn: () => api.getFixtures(),
  });
  const setupSteps = [
    ['Create a competition', '/admin/competitions', (query.data?.summary.competitions ?? 0) > 0],
    ['Add teams', '/admin/teams', (teams.data?.total ?? 0) > 1],
    ['Register players', '/admin/teams', (players.data?.total ?? 0) > 0],
    ['Publish fixtures', '/admin/fixtures', (fixtures.data?.total ?? 0) > 0],
  ] as const;
  const completedSteps = setupSteps.filter((step) => step[2]).length;

  return (
    <PageScaffold
      eyebrow="Administration"
      title="Admin Dashboard"
      description="A single command centre for configuring InstaScore, jumping into operational work and checking platform readiness."
      status={`${completedSteps} of ${setupSteps.length} setup steps complete`}
    >
      {query.isLoading && <LoadingState label="Loading admin overview" />}
      {query.isError && <ErrorState description="Admin overview could not be loaded." />}
      {query.data && (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            {Object.entries(query.data.summary).map(([key, value]) => (
              <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      {key.replace(/[A-Z]/g, ' $&')}
                    </Typography>
                    <Typography variant="h4" fontWeight={950}>
                      {value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6">Launch checklist</Typography>
                <Typography color="text.secondary">
                  Complete these steps in order to publish a useful competition experience.
                </Typography>
                <Grid container spacing={1}>
                  {setupSteps.map(([label, path, complete], index) => (
                    <Grid key={label} size={{ xs: 12, md: 6 }}>
                      <Button
                        component={RouterLink}
                        to={path}
                        variant={complete ? 'outlined' : 'contained'}
                        color={complete ? 'success' : 'primary'}
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        {complete ? '✓' : index + 1} &nbsp; {label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
                <Typography variant="h6" sx={{ pt: 1 }}>
                  Platform status
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    color={query.data.settings.maintenanceMode ? 'warning' : 'success'}
                    label={
                      query.data.settings.maintenanceMode
                        ? 'Maintenance mode on'
                        : 'Public app enabled'
                    }
                  />
                  <Chip
                    color={
                      query.data.settings.emergencyNotificationsDisabled ? 'warning' : 'success'
                    }
                    label={
                      query.data.settings.emergencyNotificationsDisabled
                        ? 'Automated notifications disabled'
                        : 'Automated notifications enabled'
                    }
                  />
                  <Chip label={`Retention ${query.data.settings.dataRetentionDays} days`} />
                  {Object.entries(query.data.settings.featureFlags).map(([flag, enabled]) => (
                    <Chip
                      key={flag}
                      color={enabled ? 'success' : 'default'}
                      label={`${flag}: ${enabled ? 'on' : 'off'}`}
                    />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            {adminSections.map(([title, path, description]) => (
              <Grid key={path} size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant="h6">{title}</Typography>
                      <Typography color="text.secondary">{description}</Typography>
                      <Button
                        component={RouterLink}
                        to={path}
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
                      >
                        Open {title}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}
    </PageScaffold>
  );
}
