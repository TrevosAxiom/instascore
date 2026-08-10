import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { SportSwitcher } from '../../components/SportSwitcher';
import type { Fixture, FixtureStatus } from '../../types/api';
import { statusLabel } from './fixtureFormat';
import { ProviderUpcomingCards } from './ProviderUpcomingCards';
import { usePwa } from '../../pwa/PwaProvider';

type SportTab = 'flag' | 'football' | 'basketball';
type ScoreFilter = 'all' | 'live' | 'finished' | 'upcoming';

const liveStatuses: FixtureStatus[] = ['warmup', 'live', 'halftime', 'interval'];
const finishedStatuses: FixtureStatus[] = ['completed', 'confirmed'];
const upcomingStatuses: FixtureStatus[] = ['draft', 'scheduled', 'postponed'];

function localDateValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDateValue(date);
}

function matchesFilter(status: FixtureStatus, filter: ScoreFilter) {
  if (filter === 'live') return liveStatuses.includes(status);
  if (filter === 'finished') return finishedStatuses.includes(status);
  if (filter === 'upcoming') return upcomingStatuses.includes(status);
  return true;
}

function initialSportTab(value?: string): SportTab {
  if (value === 'basketball') return 'basketball';
  if (value === 'flag' || value === 'flag-football') return 'flag';
  return 'football';
}

export function LiveScoresBoard({ initialSport }: { initialSport?: string }) {
  const api = useApi();
  const pwa = usePwa();
  const [sport, setSport] = useState<SportTab>(() => initialSportTab(initialSport));
  const [filter, setFilter] = useState<ScoreFilter>('all');
  const [date, setDate] = useState(localDateValue(new Date()));
  const params = useMemo(() => new URLSearchParams({ date, per_page: '50' }), [date]);
  const football = useQuery({
    queryKey: ['live-scores', 'football', date],
    queryFn: () => api.getFixtures(params),
    enabled: sport !== 'basketball',
  });
  const providerFootball = useQuery({
    queryKey: ['live-scores', 'api-football-live'],
    queryFn: api.getFootballLive,
    enabled: sport === 'football' && date === localDateValue(new Date()),
    refetchInterval: 30_000,
  });
  const basketball = useQuery({
    queryKey: ['live-scores', 'basketball'],
    queryFn: api.getBasketballLive,
    enabled: sport === 'basketball' && date === localDateValue(new Date()),
    refetchInterval: 30_000,
  });
  const providerUpcoming = useQuery({
    queryKey: ['provider-upcoming', sport, date],
    queryFn: () =>
      api.getProviderMatches(sport === 'basketball' ? 'basketball' : 'football', 'upcoming', date),
    enabled: sport === 'football' || sport === 'basketball',
  });
  const providerPrevious = useQuery({
    queryKey: ['provider-previous', sport, date],
    queryFn: () =>
      api.getProviderMatches(sport === 'basketball' ? 'basketball' : 'football', 'previous', date),
    enabled: sport === 'football' || sport === 'basketball',
  });
  const fixtures = (football.data?.items ?? []).filter((fixture) => {
    if (sport === 'flag') return fixture.sport.slug.includes('flag-football');
    if (sport === 'football') return fixture.sport.slug === 'football';
    return false;
  });
  const scoreQueries = useQueries({
    queries: fixtures.map((fixture) => ({
      queryKey: ['live-score-row', fixture.uuid],
      queryFn: () => api.getLiveMatch(fixture.uuid),
      enabled: sport !== 'basketball' && !upcomingStatuses.includes(fixture.status),
      staleTime: 15_000,
      retry: false,
    })),
  });
  const scores = new Map(
    fixtures.map((fixture, index) => [fixture.uuid, scoreQueries[index]?.data?.score] as const),
  );
  const filteredFixtures = fixtures.filter((fixture) => matchesFilter(fixture.status, filter));
  const datedProviderUpcoming = (providerUpcoming.data ?? []).filter(
    (match) => (match.kickoffAt ?? '').slice(0, 10) === date,
  );
  const datedProviderPrevious = (providerPrevious.data ?? []).filter(
    (match) => (match.kickoffAt ?? '').slice(0, 10) === date,
  );
  const grouped = Object.entries(
    filteredFixtures.reduce<Record<string, Fixture[]>>((groups, fixture) => {
      (groups[fixture.competition.name] ??= []).push(fixture);
      return groups;
    }, {}),
  );
  const counts = {
    all:
      fixtures.length +
      (sport === 'football'
        ? (providerFootball.data?.length ?? 0)
        : (basketball.data?.length ?? 0)) +
      datedProviderUpcoming.length +
      datedProviderPrevious.length,
    live:
      fixtures.filter((fixture) => liveStatuses.includes(fixture.status)).length +
      (sport === 'football'
        ? (providerFootball.data?.length ?? 0)
        : (basketball.data?.length ?? 0)),
    finished:
      fixtures.filter((fixture) => finishedStatuses.includes(fixture.status)).length +
      datedProviderPrevious.length,
    upcoming:
      fixtures.filter((fixture) => upcomingStatuses.includes(fixture.status)).length +
      datedProviderUpcoming.length,
  };
  const providerGroups = Object.entries(
    (providerFootball.data ?? []).reduce<Record<string, typeof providerFootball.data>>(
      (groups, game) => {
        (groups[game.competitionName] ??= []).push(game);
        return groups;
      },
      {},
    ),
  );
  const basketballGroups = Object.entries(
    (basketball.data ?? []).reduce<Record<string, NonNullable<typeof basketball.data>>>(
      (groups, game) => {
        (groups[game.competitionName ?? 'Basketball'] ??= []).push(game);
        return groups;
      },
      {},
    ),
  );
  const basketballVisibleCount =
    (filter === 'all' || filter === 'live' ? (basketball.data?.length ?? 0) : 0) +
    (filter === 'all' || filter === 'upcoming' ? datedProviderUpcoming.length : 0) +
    (filter === 'all' || filter === 'finished' ? datedProviderPrevious.length : 0);

  useEffect(() => {
    if (!pwa.standalone) return;
    void pwa.setBadge(counts.live);
    return () => { void pwa.setBadge(); };
  }, [counts.live, pwa]);

  return (
    <Stack spacing={2.5}>
      {pwa.standalone && pwa.nativeCapabilities.wakeLock && (
        <Button
          variant={pwa.wakeLockActive ? 'contained' : 'outlined'}
          onClick={() => void pwa.setWakeLock(!pwa.wakeLockActive)}
          sx={{ alignSelf: 'flex-end' }}
        >
          {pwa.wakeLockActive ? 'Screen stays awake' : 'Keep screen awake'}
        </Button>
      )}
      <Paper
        elevation={0}
        sx={{ overflow: 'hidden', borderRadius: 5, border: 1, borderColor: 'divider' }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ p: 1.5, bgcolor: '#082f63', color: '#fff' }}
        >
          <Button
            aria-label="Previous day"
            onClick={() => setDate((value) => shiftDate(value, -1))}
            sx={{ minWidth: 48, color: 'inherit', fontSize: 26 }}
          >
            ‹
          </Button>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Typography
              fontWeight={900}
              sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 150, textAlign: 'center' }}
            >
              {new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
                new Date(`${date}T12:00:00`),
              )}
            </Typography>
            <TextField
              aria-label="Scores date picker"
              type="date"
              size="small"
              value={date}
              onChange={(event) => event.target.value && setDate(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': 'Choose scores date' } }}
              sx={{
                width: { xs: '100%', sm: 170 },
                bgcolor: '#fff',
                borderRadius: 1,
                '& input': { py: 1, color: '#07192d', fontWeight: 850 },
              }}
            />
          </Stack>
          <Button
            aria-label="Next day"
            onClick={() => setDate((value) => shiftDate(value, 1))}
            sx={{ minWidth: 48, color: 'inherit', fontSize: 26 }}
          >
            ›
          </Button>
        </Stack>

        <SportSwitcher
          includeAll={false}
          sports={[
            { uuid: 'flag', slug: 'flag-football', name: 'Flag' },
            { uuid: 'football', slug: 'football', name: 'Soccer' },
            { uuid: 'basketball', slug: 'basketball', name: 'Basketball' },
          ]}
          value={sport === 'flag' ? 'flag-football' : sport}
          onChange={(value) => {
            setSport(value === 'flag-football' ? 'flag' : (value as SportTab));
            setFilter('all');
          }}
        />

        <Stack direction="row" spacing={1} sx={{ p: { xs: 1.25, sm: 2 }, overflowX: 'auto' }}>
          {(Object.keys(counts) as ScoreFilter[]).map((value) => (
            <Button
              key={value}
              onClick={() => setFilter(value)}
              variant={filter === value ? 'contained' : 'outlined'}
              sx={{ flexShrink: 0, borderRadius: 99, textTransform: 'capitalize' }}
            >
              {value}
              <Chip label={counts[value]} size="small" sx={{ ml: 1, height: 24 }} />
            </Button>
          ))}
        </Stack>
      </Paper>

      {sport !== 'basketball' ? (
        <Stack spacing={2}>
          {football.isLoading ? <CircularProgress aria-label="Loading soccer scores" /> : null}
          {football.isError ? <ErrorState title="Soccer scores could not be loaded." /> : null}
          {sport === 'football' && providerFootball.isError ? (
            <ErrorState title="The soccer live feed could not be loaded." />
          ) : null}
          {sport === 'football' && (filter === 'all' || filter === 'live')
            ? providerGroups.map(([competition, games]) => (
                <Paper
                  key={competition}
                  variant="outlined"
                  sx={{ overflow: 'hidden', borderRadius: 3 }}
                >
                  <Typography
                    fontWeight={950}
                    sx={{ px: 1.75, py: 1, bgcolor: 'rgba(7,25,45,.04)' }}
                  >
                    {competition}
                  </Typography>
                  {games?.map((game) => (
                    <Box
                      key={game.providerId}
                      component={RouterLink}
                      to={`/football/matches/${game.providerId}`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '54px minmax(0,1fr) auto',
                          sm: '80px minmax(0,1fr) auto',
                        },
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        color: 'inherit',
                        textDecoration: 'none',
                        borderTop: 1,
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'rgba(7,25,45,.035)' },
                      }}
                    >
                      <Stack spacing={0.1}>
                        <Chip size="small" color="success" label="LIVE" />
                        <Typography variant="caption" textAlign="center" fontWeight={900}>
                          {game.elapsed ? `${game.elapsed}'` : game.statusShort}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.35}>
                        {(
                          [
                            [game.homeTeamName, game.homeTeamLogoUrl, game.homeScore],
                            [game.awayTeamName, game.awayTeamLogoUrl, game.awayScore],
                          ] as const
                        ).map(([name, logo, score]) => (
                          <Stack key={name} direction="row" alignItems="center" spacing={0.75}>
                            <EntityAvatar
                              entity="team"
                              src={logo}
                              alt={`${name} logo`}
                              sx={{ width: 25, height: 25, bgcolor: '#fff' }}
                            />
                            <Typography noWrap fontWeight={850} sx={{ flex: 1 }}>
                              {name}
                            </Typography>
                            <Typography fontWeight={950}>{score}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <Typography color="text.secondary" fontWeight={900}>
                        ›
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              ))
            : null}
          {sport === 'football' && (filter === 'all' || filter === 'upcoming') ? (
            <ProviderUpcomingCards matches={datedProviderUpcoming} />
          ) : null}
          {sport === 'football' && (filter === 'all' || filter === 'finished') ? (
            <ProviderUpcomingCards matches={datedProviderPrevious} kind="finished" />
          ) : null}
          {!football.isLoading &&
          !grouped.length &&
          !(
            sport === 'football' &&
            (filter === 'all' || filter === 'live') &&
            providerFootball.data?.length
          ) &&
          !(
            sport === 'football' &&
            (filter === 'all' || filter === 'finished') &&
            datedProviderPrevious.length
          ) &&
          !(
            sport === 'football' &&
            (filter === 'all' || filter === 'upcoming') &&
            datedProviderUpcoming.length
          ) ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="h5" fontWeight={950}>
                No {filter === 'all' ? `${sport} matches` : filter} on this date
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Choose another day or status to continue browsing.
              </Typography>
            </Paper>
          ) : null}
          {grouped.map(([competition, competitionFixtures]) => (
            <Paper
              key={competition}
              variant="outlined"
              sx={{ overflow: 'hidden', borderRadius: 4 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ px: 2, py: 1.5, bgcolor: 'rgba(7,25,45,.035)' }}
              >
                <Typography fontWeight={950}>{competition}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {competitionFixtures[0]?.season.name}
                </Typography>
              </Stack>
              {competitionFixtures.map((fixture) => {
                const score = scores.get(fixture.uuid);
                return (
                  <Box
                    key={fixture.uuid}
                    component={RouterLink}
                    to={`/fixtures/${fixture.uuid}`}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '64px 1fr auto', sm: '120px 1fr auto' },
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 2,
                      borderTop: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'rgba(7,25,45,.045)' },
                    }}
                  >
                    <Typography variant="caption" fontWeight={900} color="primary.dark">
                      {finishedStatuses.includes(fixture.status)
                        ? 'FT'
                        : liveStatuses.includes(fixture.status)
                          ? statusLabel(fixture.status)
                          : new Intl.DateTimeFormat(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(fixture.kickoffAt))}
                    </Typography>
                    <Stack spacing={0.75}>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography fontWeight={850}>{fixture.homeTeam.name}</Typography>
                        <Typography fontWeight={950}>{score?.home ?? '–'}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography fontWeight={850}>{fixture.awayTeam.name}</Typography>
                        <Typography fontWeight={950}>{score?.away ?? '–'}</Typography>
                      </Stack>
                    </Stack>
                    <Chip size="small" label={statusLabel(fixture.status)} />
                  </Box>
                );
              })}
            </Paper>
          ))}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {basketball.isLoading ? (
            <CircularProgress aria-label="Loading basketball scores" />
          ) : null}
          {basketball.isError ? (
            <ErrorState title="Basketball scores could not be loaded." />
          ) : null}
          {!basketball.isLoading && basketballVisibleCount === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="h5" fontWeight={950}>
                No {filter === 'all' ? 'basketball games' : filter} on this date
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Choose another date or match status to continue browsing.
              </Typography>
            </Paper>
          ) : null}
          {filter === 'all' || filter === 'upcoming' ? (
            <ProviderUpcomingCards matches={datedProviderUpcoming} />
          ) : null}
          {filter === 'all' || filter === 'finished' ? (
            <ProviderUpcomingCards matches={datedProviderPrevious} kind="finished" />
          ) : null}
          {(filter === 'all' || filter === 'live') &&
            basketballGroups.map(([competition, games]) => (
              <Paper
                key={competition}
                variant="outlined"
                sx={{ overflow: 'hidden', borderRadius: 3 }}
              >
                <Typography fontWeight={950} sx={{ px: 1.75, py: 1, bgcolor: 'rgba(7,25,45,.04)' }}>
                  {competition}
                </Typography>
                {games.map((game) => (
                  <Box
                    key={game.providerId}
                    component={RouterLink}
                    to={`/basketball/matches/${game.providerId}`}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '54px minmax(0,1fr) auto',
                        sm: '80px minmax(0,1fr) auto',
                      },
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      color: 'inherit',
                      textDecoration: 'none',
                      borderTop: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'rgba(7,25,45,.035)' },
                    }}
                  >
                    <Stack spacing={0.1}>
                      <Chip size="small" color="success" label="LIVE" />
                      <Typography variant="caption" textAlign="center" fontWeight={900}>
                        {game.sportState.periodLabel}
                        {game.sportState.clock ? ` · ${game.sportState.clock}` : ''}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.35}>
                      {(
                        [
                          [game.homeTeamName, game.homeTeamLogoUrl, game.homeScore],
                          [game.awayTeamName, game.awayTeamLogoUrl, game.awayScore],
                        ] as const
                      ).map(([name, logo, score]) => (
                        <Stack key={name} direction="row" alignItems="center" spacing={0.75}>
                          <EntityAvatar
                            entity="team"
                            src={logo}
                            alt={`${name} logo`}
                            sx={{ width: 25, height: 25 }}
                          />
                          <Typography noWrap fontWeight={850} sx={{ flex: 1 }}>
                            {name}
                          </Typography>
                          <Typography fontWeight={950}>{score}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    <Typography color="text.secondary" fontWeight={900}>
                      ›
                    </Typography>
                  </Box>
                ))}
              </Paper>
            ))}
        </Stack>
      )}
    </Stack>
  );
}
