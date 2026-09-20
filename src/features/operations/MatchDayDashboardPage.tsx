import { Alert, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { formatKickoff, statusLabel } from '../fixtures/fixtureFormat';

export function MatchDayDashboardPage() {
  const api = useApi();
  const auth = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const query = useQuery({
    queryKey: ['match-day-board', today],
    queryFn: () => api.getFixtures(new URLSearchParams({ date: today, per_page: '50' })),
    refetchInterval: 30_000,
  });
  const canScore = Boolean(auth.state?.user?.capabilities.manageScoring);

  return (
    <PageScaffold
      eyebrow="Match day"
      title="Officials’ Control Room"
      description="Today’s fixtures, venues, match status and scoring access in one mobile-ready workspace."
      status={canScore ? 'Scoring enabled' : 'Official view'}
    >
      <Alert severity="info">
        Confirm teams and venue before kickoff. Scorekeepers should claim a match before entering
        events; officials have a read-only match-day view.
      </Alert>
      {query.isLoading ? <LoadingState label="Loading today’s match board" /> : null}
      {query.isError ? <ErrorState title="Match-day board could not be loaded." /> : null}
      {!query.isLoading && !query.isError && !query.data?.items.length ? (
        <EmptyState
          title="No fixtures today"
          description="Published fixtures for today will appear here automatically."
        />
      ) : null}
      <Grid container spacing={1.5}>
        {query.data?.items.map((fixture) => (
          <Grid key={fixture.uuid} size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip label={fixture.sport.name} size="small" />
                    <Chip
                      label={statusLabel(fixture.status)}
                      color={fixture.status === 'live' ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="h6" fontWeight={950}>
                    {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                  </Typography>
                  <Typography color="text.secondary">
                    {formatKickoff(fixture)} · {fixture.venue?.name ?? 'Venue to be confirmed'}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={RouterLink}
                      to={`/fixtures/${fixture.uuid}`}
                      variant="outlined"
                    >
                      Match centre
                    </Button>
                    {canScore ? (
                      <Button
                        component={RouterLink}
                        to={`/operations/fixtures/${fixture.uuid}`}
                        variant="contained"
                      >
                        Open controls
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PageScaffold>
  );
}
