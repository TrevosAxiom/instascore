import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
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

function localDateValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDateValue(date);
}

export function FixtureListPage({ mode = 'fixtures' }: { mode?: 'scores' | 'fixtures' }) {
  const api = useApi();
  const { state } = useAuth();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(() => localDateValue(new Date()));
  const [sport, setSport] = useState(searchParams.get('sport') ?? '');
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const params = useMemo(() => {
    const query = new URLSearchParams();
    query.set('date', date);
    query.set('per_page', '50');
    if (sport) query.set('sport', sport);
    return query;
  }, [date, sport]);
  const query = useQuery({
    queryKey: ['fixtures', date, sport],
    queryFn: () => api.getFixtures(params),
  });
  const footballUpcoming = useQuery({
    queryKey: ['provider-upcoming', 'football', date],
    queryFn: () => api.getProviderMatches('football', 'upcoming', date),
    enabled: !sport || sport === 'football',
  });
  const basketballUpcoming = useQuery({
    queryKey: ['provider-upcoming', 'basketball', date],
    queryFn: () => api.getProviderMatches('basketball', 'upcoming', date),
    enabled: !sport || sport === 'basketball',
  });
  const nflUpcoming = useQuery({
    queryKey: ['provider-upcoming', 'nfl', date],
    queryFn: () => api.getProviderMatches('nfl', 'upcoming', date),
    enabled: !sport || sport === 'nfl',
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
    ...(nflUpcoming.data ?? []),
  ].filter((match) => (match.kickoffAt ?? '').slice(0, 10) === date);
  const fixtureGroups = Object.entries(
    displayedFixtures.reduce<Record<string, typeof displayedFixtures>>((groups, fixture) => {
      (groups[fixture.competition.name] ??= []).push(fixture);
      return groups;
    }, {}),
  );
  const selectedDateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`));

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
      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 4 }}>
        <SportSwitcher sports={sports.data ?? []} value={sport} onChange={setSport} />
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: { xs: 1, sm: 2 }, py: 1.25, bgcolor: 'secondary.main', color: '#fff' }}
        >
          <Button
            aria-label="Previous day"
            onClick={() => setDate((value) => shiftDate(value, -1))}
            sx={{ minWidth: 42, color: 'inherit', fontSize: 24 }}
          >
            ‹
          </Button>
          <Stack alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={950} noWrap>
              {selectedDateLabel}
            </Typography>
            <TextField
              aria-label="Fixtures date"
              type="date"
              size="small"
              value={date}
              onChange={(event) => event.target.value && setDate(event.target.value)}
              sx={{
                width: 158,
                bgcolor: '#fff',
                borderRadius: 1,
                '& input': { py: 0.65, fontSize: 13, fontWeight: 850 },
              }}
            />
          </Stack>
          <Button
            aria-label="Next day"
            onClick={() => setDate((value) => shiftDate(value, 1))}
            sx={{ minWidth: 42, color: 'inherit', fontSize: 24 }}
          >
            ›
          </Button>
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            label={`${displayedFixtures.length + providerFixtures.length} matches`}
            color="primary"
          />
          <Typography color="text.secondary" fontWeight={750}>
            Grouped by competition · Times shown locally
          </Typography>
        </Stack>
        {state?.user?.capabilities.manageFixtures ? (
          <Button
            component={RouterLink}
            to="/admin/fixtures"
            variant="contained"
            color="primary"
            sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Manage fixtures
          </Button>
        ) : null}
      </Stack>

      <Stack spacing={2}>
        {query.isLoading && <LoadingState label="Loading fixtures" />}
        {query.isError && <ErrorState title="Fixtures could not be loaded." />}
        {!query.isLoading && displayedFixtures.length === 0 && providerFixtures.length === 0 && (
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
        {fixtureGroups.map(([competition, competitionFixtures]) => (
          <Paper key={competition} variant="outlined" sx={{ overflow: 'hidden', borderRadius: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ px: 1.5, py: 1, bgcolor: 'rgba(7,25,45,.045)' }}
            >
              <Typography fontWeight={950}>{competition}</Typography>
              <Typography variant="caption" color="text.secondary">
                {competitionFixtures.length} matches
              </Typography>
            </Stack>
            <Box sx={{ p: 1 }}>
              <FixtureCards fixtures={competitionFixtures} />
            </Box>
          </Paper>
        ))}
        <ProviderUpcomingCards matches={providerFixtures} />
      </Stack>
    </PageScaffold>
  );
}
