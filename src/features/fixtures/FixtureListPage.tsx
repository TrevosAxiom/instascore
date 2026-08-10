import { Box, Button, Grid, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { SportSwitcher } from '../../components/SportSwitcher';
import { FixtureCards } from './FixtureCards';
import { LiveScoresBoard } from './LiveScoresBoard';
import { ProviderUpcomingCards } from './ProviderUpcomingCards';

export function FixtureListPage({ mode = 'fixtures' }: { mode?: 'scores' | 'fixtures' }) {
  const api = useApi();
  const { state } = useAuth();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState('');
  const [sport, setSport] = useState(searchParams.get('sport') ?? '');
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const params = useMemo(() => {
    const query = new URLSearchParams();
    if (date) query.set('date', date);
    if (sport) query.set('sport', sport);
    return query;
  }, [date, sport]);
  const query = useQuery({
    queryKey: ['fixtures', date, sport],
    queryFn: () => api.getFixtures(params),
  });
  const footballUpcoming = useQuery({
    queryKey: ['provider-upcoming', 'football', date],
    queryFn: () => api.getProviderMatches('football', 'upcoming', date || undefined),
    enabled: !sport || sport === 'football',
  });
  const basketballUpcoming = useQuery({
    queryKey: ['provider-upcoming', 'basketball', date],
    queryFn: () => api.getProviderMatches('basketball', 'upcoming', date || undefined),
    enabled: !sport || sport === 'basketball',
  });
  const fixtures = query.data?.items ?? [];
  const displayedFixtures =
    mode === 'scores'
      ? fixtures.filter((fixture) =>
          ['warmup', 'live', 'halftime', 'interval', 'completed', 'confirmed'].includes(
            fixture.status,
          ),
        )
      : fixtures;
  const providerFixtures = [
    ...(footballUpcoming.data ?? []),
    ...(basketballUpcoming.data ?? []),
  ].filter((match) => !date || (match.kickoffAt ?? '').slice(0, 10) === date);

  if (mode === 'scores') {
    return (
      <PageScaffold
        eyebrow="Live match centre"
        title="Scores"
        description="Move between match days, switch sports and follow every competition from one scoreboard."
        status="Updates automatically"
      >
        <LiveScoresBoard initialSport={sport} />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      eyebrow="Schedule"
      title="Fixtures"
      description="Browse upcoming fixtures with competition, venue and local-time kickoff details."
    >
      <SportSwitcher sports={sports.data ?? []} value={sport} onChange={setSport} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack
            spacing={2}
            sx={{
              p: 2,
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              borderTop: '4px solid',
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="overline" color="primary.main" fontWeight={950}>
              Match filters
            </Typography>
            <TextField
              label="Day view"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                bgcolor: '#ffffff',
                '& .MuiOutlinedInput-root': { borderRadius: 0 },
              }}
            />
            {state?.user?.capabilities.manageFixtures ? (
              <Button
                component={RouterLink}
                to="/admin/fixtures"
                variant="contained"
                color="primary"
                sx={{ borderRadius: 0 }}
              >
                Manage fixtures
              </Button>
            ) : null}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                pb: 1,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography fontWeight={950}>Upcoming matches</Typography>
              <Typography color="text.secondary" fontWeight={800}>
                {displayedFixtures.length + providerFixtures.length} found
              </Typography>
            </Box>

            {query.isLoading && <LoadingState label="Loading fixtures" />}
            {query.isError && <ErrorState title="Fixtures could not be loaded." />}
            {!query.isLoading &&
              displayedFixtures.length === 0 &&
              providerFixtures.length === 0 && (
                <Box
                  sx={{
                    minHeight: 260,
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    bgcolor: 'rgba(255,255,255,.65)',
                    textAlign: 'center',
                    px: 3,
                  }}
                >
                  <Box>
                    <Typography variant="h5" fontWeight={950}>
                      No fixtures found
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      Try another date or check back when the organiser publishes the schedule.
                    </Typography>
                  </Box>
                </Box>
              )}
            <FixtureCards fixtures={displayedFixtures} />
            <ProviderUpcomingCards matches={providerFixtures} />
          </Stack>
        </Grid>
      </Grid>
    </PageScaffold>
  );
}
