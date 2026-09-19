import { Alert, Box, Paper, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';
import { SportSwitcher } from '../../components/SportSwitcher';

type ProviderSport = 'football' | 'basketball' | 'nfl';

export function LeagueTablePage() {
  const api = useApi();
  const [searchParams] = useSearchParams();
  const [sport, setSport] = useState(searchParams.get('sport') ?? '');
  const [selection, setSelection] = useState(searchParams.get('competition') ?? '');
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const competitions = useQuery({
    queryKey: ['standings', 'competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50', sort: 'name' })),
  });
  const footballCompetitions = useQuery({
    queryKey: ['provider-competitions', 'football'],
    queryFn: () => api.getProviderCompetitions('football'),
    enabled: !sport || sport === 'football',
  });
  const basketballCompetitions = useQuery({
    queryKey: ['provider-competitions', 'basketball'],
    queryFn: () => api.getProviderCompetitions('basketball'),
    enabled: !sport || sport === 'basketball',
  });
  const nflCompetitions = useQuery({
    queryKey: ['provider-competitions', 'nfl'],
    queryFn: () => api.getProviderCompetitions('nfl'),
    enabled: !sport || sport === 'nfl',
  });

  const options = useMemo(() => {
    const local = (competitions.data?.items ?? [])
      .filter((competition) => !sport || competition.sport.slug === sport)
      .map((competition) => ({
        id: `local:${competition.uuid}`,
        name: competition.name,
        sport: competition.sport.slug,
        season: '',
      }));
    const providers = [
      ...(footballCompetitions.data ?? []).map((competition) => ({
        ...competition,
        sport: 'football' as const,
      })),
      ...(basketballCompetitions.data ?? []).map((competition) => ({
        ...competition,
        sport: 'basketball' as const,
      })),
      ...(nflCompetitions.data ?? []).map((competition) => ({
        ...competition,
        sport: 'nfl' as const,
      })),
    ]
      .filter((competition) => !sport || competition.sport === sport)
      .map((competition) => ({
        id: `provider:${competition.sport}:${competition.providerId}`,
        name: competition.name,
        sport: competition.sport,
        season: competition.currentSeason ?? '',
      }));
    return [...local, ...providers].sort((left, right) => left.name.localeCompare(right.name));
  }, [
    basketballCompetitions.data,
    competitions.data,
    footballCompetitions.data,
    nflCompetitions.data,
    sport,
  ]);

  useEffect(() => {
    if (!options.some((option) => option.id === selection)) setSelection(options[0]?.id ?? '');
  }, [options, selection]);

  const selectedOption = options.find((option) => option.id === selection);
  const parts = selection.split(':');
  const selectionKind = parts[0] ?? '';
  const selectionSport = parts[1] ?? '';
  const selectionId = parts[2] ?? '';
  const localTable = useQuery({
    queryKey: ['standings', selection],
    queryFn: () => api.getStandings(selectionSport),
    enabled: selectionKind === 'local' && Boolean(selectionSport),
  });
  const providerTable = useQuery({
    queryKey: ['provider-standings', selection, selectedOption?.season],
    queryFn: () =>
      api.getProviderStandings(
        selectionSport as ProviderSport,
        selectionId,
        selectedOption?.season,
      ),
    enabled: selectionKind === 'provider' && Boolean(selectionSport && selectionId),
  });
  const rows = selectionKind === 'provider' ? (providerTable.data ?? []) : (localTable.data ?? []);
  const loading = competitions.isLoading || localTable.isLoading || providerTable.isLoading;
  const failed = localTable.isError || providerTable.isError;

  return (
    <PageScaffold
      eyebrow="Tables"
      title="League tables"
      description="Switch sports and competitions to see current flag football, soccer, NFL and basketball standings."
    >
      <SportSwitcher sports={sports.data ?? []} value={sport} onChange={setSport} />
      <TextField
        select
        SelectProps={{ native: true }}
        label="Competition"
        value={selection}
        onChange={(event) => setSelection(event.target.value)}
        sx={{ minWidth: { xs: '100%', sm: 360 } }}
      >
        <option value="">Select a competition</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </TextField>
      {loading && <LoadingState label="Loading standings" />}
      {failed && (
        <ErrorState
          title="Standings could not be loaded."
          description="The saved table was unavailable and the provider fallback did not complete."
        />
      )}
      {!loading && !failed && options.length === 0 && (
        <EmptyState
          title="No competitions available"
          description="Add a competition or configure provider league IDs in Settings."
        />
      )}
      {!loading && !failed && selection && rows.length === 0 && (
        <EmptyState
          title="No standings yet"
          description="This competition has no saved table for its current season."
        />
      )}
      {rows.length > 0 && (
        <Stack spacing={1}>
          <Alert severity="info">
            {selectedOption?.name} · {selectedOption?.season || 'Current season'}
          </Alert>
          {selectionKind === 'local' && localTable.data?.[0]?.tiebreakerOrder?.length ? (
            <Alert severity="info">
              Sorted by {localTable.data[0].tiebreakerOrder.join(', ')}.
            </Alert>
          ) : null}
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 3 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '38px minmax(150px,1fr) repeat(6,44px)',
                gap: 1,
                px: 1.5,
                py: 1,
                bgcolor: 'secondary.main',
                color: '#fff',
                fontWeight: 900,
                overflowX: 'auto',
              }}
            >
              <span>#</span>
              <span>Team</span>
              <span>P</span>
              <span>W</span>
              <span>D</span>
              <span>L</span>
              <span>Diff</span>
              <span>Pts</span>
            </Box>
            {rows.map((row) => {
              const provider = 'teamProviderId' in row;
              const teamName = provider ? row.teamName : row.team.name;
              const teamLogo = provider ? row.teamLogoUrl : undefined;
              return (
                <Box
                  key={provider ? row.teamProviderId : row.uuid}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '38px minmax(150px,1fr) repeat(6,44px)',
                    gap: 1,
                    alignItems: 'center',
                    px: 1.5,
                    py: 1.1,
                    borderTop: 1,
                    borderColor: 'divider',
                    overflowX: 'auto',
                  }}
                >
                  <Typography fontWeight={950}>{row.position}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EntityAvatar
                      entity="team"
                      src={teamLogo}
                      alt={`${teamName} logo`}
                      sx={{ width: 28, height: 28 }}
                    />
                    <Typography fontWeight={850} noWrap>
                      {teamName}
                    </Typography>
                  </Stack>
                  <Typography>{row.played}</Typography>
                  <Typography>{row.wins}</Typography>
                  <Typography>{row.draws ?? 0}</Typography>
                  <Typography>{row.losses}</Typography>
                  <Typography>{row.pointDifference}</Typography>
                  <Typography fontWeight={950}>{row.points}</Typography>
                </Box>
              );
            })}
          </Paper>
        </Stack>
      )}
    </PageScaffold>
  );
}
