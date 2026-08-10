import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

type ProviderSport = 'football' | 'basketball';
type SyncType =
  | 'competitions'
  | 'teams'
  | 'players'
  | 'fixtures'
  | 'upcoming'
  | 'previous'
  | 'live'
  | 'standings'
  | 'statistics';

type Filters = Record<string, string>;

export function AdminProvidersPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [sport, setSport] = useState<ProviderSport>('football');
  const [syncType, setSyncType] = useState<SyncType>('fixtures');
  const [dryRun, setDryRun] = useState(true);
  const [filters, setFilters] = useState<Filters>({ timezone: 'Africa/Lagos' });
  const [validationError, setValidationError] = useState('');
  const health = useQuery({
    queryKey: ['providers', sport, 'health'],
    queryFn: () => api.getProviderHealth(sport),
  });
  const sync = useMutation({
    mutationFn: () =>
      api.syncProvider(sport, {
        syncType,
        dryRun,
        filters: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers', sport, 'health'] }),
  });

  const needsLeague = [
    'teams',
    'players',
    'fixtures',
    'upcoming',
    'previous',
    'standings',
  ].includes(syncType);
  const needsSeason = ['teams', 'players', 'fixtures', 'standings'].includes(syncType);
  const allowsTeam = ['teams', 'players', 'fixtures', 'upcoming', 'previous'].includes(syncType);
  const allowsSearch = ['competitions', 'teams', 'players'].includes(syncType);
  const allowsTimezone = ['fixtures', 'upcoming', 'previous', 'live'].includes(syncType);

  const updateFilter = (key: string, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const runSync = () => {
    if (syncType === 'standings' && (!filters.leagueId || !filters.season)) {
      setValidationError('League ID and season are required for a standings call.');
      return;
    }
    if (
      syncType === 'fixtures' &&
      ((filters.from && !filters.to) || (!filters.from && filters.to))
    ) {
      setValidationError('Use both From and To dates for a fixture range.');
      return;
    }
    setValidationError('');
    sync.mutate();
  };

  return (
    <PageScaffold
      eyebrow="Provider"
      title="External sports providers"
      description="Monitor football and basketball imports, mapping conflicts, dry-run previews and provider health."
      status="Administrator"
    >
      {health.isLoading ? <LoadingState label="Loading provider health" /> : null}
      {health.isError ? <ErrorState description="Provider health could not be loaded." /> : null}
      {health.data ? (
        <Stack spacing={3}>
          <Box className="instascore-panel">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField
                select
                label="Provider sport"
                value={sport}
                onChange={(event) => setSport(event.target.value as ProviderSport)}
              >
                <MenuItem value="football">Football</MenuItem>
                <MenuItem value="basketball">Basketball</MenuItem>
              </TextField>
            </Stack>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="h3">{health.data.provider}</Typography>
                <Typography color="text.secondary">
                  Sport: {health.data.sport}. Official API-Sports connection. Secrets exposed to
                  browser: {health.data.secretExposed ? 'yes' : 'no'}.
                </Typography>
              </Box>
              <Chip
                color={health.data.configured ? 'success' : 'warning'}
                label={health.data.configured ? 'Configured' : 'Missing API key'}
              />
            </Stack>
          </Box>

          <Box className="instascore-panel">
            <Typography variant="h3">Manual football data calls</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Fetch a targeted API-Football dataset, preview its normalized records, then commit it
              to InstaScore's provider cache and mapping database.
            </Typography>
            {validationError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {validationError}
              </Alert>
            ) : null}
            {sync.data ? (
              <Alert
                severity={sync.data.status === 'succeeded' ? 'success' : 'warning'}
                sx={{ my: 2 }}
              >
                {sync.data.status}: {sync.data.count} normalized records. Cached data remains
                visible during outages.
              </Alert>
            ) : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <TextField
                select
                label="Sync type"
                value={syncType}
                onChange={(event) => setSyncType(event.target.value as SyncType)}
              >
                <MenuItem value="competitions">Competitions</MenuItem>
                <MenuItem value="teams">Teams</MenuItem>
                <MenuItem value="players">Players</MenuItem>
                <MenuItem value="fixtures">Fixtures/games</MenuItem>
                {sport === 'football' ? (
                  <MenuItem value="upcoming">Upcoming matches</MenuItem>
                ) : null}
                {sport === 'football' ? (
                  <MenuItem value="previous">Previous matches/results</MenuItem>
                ) : null}
                <MenuItem value="live">Live scores</MenuItem>
                <MenuItem value="standings">Standings</MenuItem>
                <MenuItem value="statistics">Statistics</MenuItem>
              </TextField>
            </Stack>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ mt: 2 }}
              flexWrap="wrap"
              useFlexGap
            >
              {needsLeague ? (
                <TextField
                  label="League ID"
                  value={filters.leagueId ?? ''}
                  onChange={(event) =>
                    updateFilter('leagueId', event.target.value.replace(/\D/g, ''))
                  }
                  helperText="API-Football league ID"
                />
              ) : null}
              {needsSeason ? (
                <TextField
                  label="Season"
                  value={filters.season ?? ''}
                  onChange={(event) =>
                    updateFilter('season', event.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="2026"
                />
              ) : null}
              {allowsTeam ? (
                <TextField
                  label="Team ID"
                  value={filters.teamId ?? ''}
                  onChange={(event) =>
                    updateFilter('teamId', event.target.value.replace(/\D/g, ''))
                  }
                  helperText="Optional team scope"
                />
              ) : null}
              {allowsSearch ? (
                <TextField
                  label="Search"
                  value={filters.search ?? ''}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  helperText="Optional name search"
                />
              ) : null}
              {syncType === 'fixtures' ? (
                <TextField
                  type="date"
                  label="From"
                  value={filters.from ?? ''}
                  onChange={(event) => updateFilter('from', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              ) : null}
              {syncType === 'fixtures' ? (
                <TextField
                  type="date"
                  label="To"
                  value={filters.to ?? ''}
                  onChange={(event) => updateFilter('to', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              ) : null}
              {syncType === 'upcoming' ? (
                <TextField
                  type="number"
                  label="Match limit"
                  value={filters.next ?? '20'}
                  onChange={(event) => updateFilter('next', event.target.value)}
                  inputProps={{ min: 1, max: 50 }}
                />
              ) : null}
              {syncType === 'previous' ? (
                <TextField
                  type="number"
                  label="Match limit"
                  value={filters.last ?? '20'}
                  onChange={(event) => updateFilter('last', event.target.value)}
                  inputProps={{ min: 1, max: 50 }}
                />
              ) : null}
              {syncType === 'players' ? (
                <TextField
                  type="number"
                  label="Page"
                  value={filters.page ?? '1'}
                  onChange={(event) => updateFilter('page', event.target.value)}
                  inputProps={{ min: 1 }}
                  helperText="API-Football player page"
                />
              ) : null}
              {allowsTimezone ? (
                <TextField
                  label="Timezone"
                  value={filters.timezone ?? ''}
                  onChange={(event) => updateFilter('timezone', event.target.value)}
                  placeholder="Africa/Lagos"
                />
              ) : null}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <TextField
                select
                label="Mode"
                value={dryRun ? 'dry' : 'commit'}
                onChange={(event) => setDryRun(event.target.value === 'dry')}
              >
                <MenuItem value="dry">Dry-run preview</MenuItem>
                <MenuItem value="commit">Commit import</MenuItem>
              </TextField>
              <Button variant="contained" onClick={runSync} disabled={sync.isPending}>
                {sync.isPending
                  ? 'Calling provider…'
                  : dryRun
                    ? 'Run sync preview'
                    : 'Run sync and import'}
              </Button>
            </Stack>
          </Box>

          <Box className="instascore-panel">
            <Typography variant="h3">Schedules</Typography>
            {Object.entries(health.data.schedules).map(([key, value]) => (
              <Typography key={key} color="text.secondary">
                {key}: {value}
              </Typography>
            ))}
          </Box>

          <Box className="instascore-panel">
            <Typography variant="h3">Mapping conflicts</Typography>
            {health.data.conflicts.length === 0 ? (
              <Typography color="text.secondary">No mapping conflicts.</Typography>
            ) : (
              health.data.conflicts.map((conflict) => (
                <Typography key={conflict.uuid}>
                  {conflict.entity_type} {conflict.provider_object_id}: {conflict.conflict_reason}
                </Typography>
              ))
            )}
          </Box>

          <Box className="instascore-panel">
            <Typography variant="h3">Recent sync logs</Typography>
            {health.data.recentSyncLogs.length === 0 ? (
              <Typography color="text.secondary">No sync logs yet.</Typography>
            ) : (
              health.data.recentSyncLogs.map((log) => (
                <Typography key={log.uuid} color="text.secondary">
                  {log.sync_type} — {log.status} — last known {log.last_known_at ?? 'not cached'}
                </Typography>
              ))
            )}
          </Box>
        </Stack>
      ) : null}
    </PageScaffold>
  );
}
