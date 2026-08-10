import {
  Button,
  Chip,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';

const eligibilityOptions = [
  ['eligible', 'Eligible'],
  ['pending', 'Pending review'],
  ['suspended', 'Suspended'],
  ['ineligible', 'Ineligible'],
] as const;

export function PlayerDirectoryPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [sport, setSport] = useState('');
  const [team, setTeam] = useState('');
  const [position, setPosition] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());
  const teams = useQuery({
    queryKey: ['teams', 'player-filters'],
    queryFn: () => api.getTeams(new URLSearchParams({ per_page: '50' })),
  });
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const params = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), per_page: '24', nationality: 'NG' });
    if (deferredSearch) query.set('search', deferredSearch);
    if (sport) query.set('sport', sport);
    if (team) query.set('team', team);
    if (position) query.set('position', position);
    if (eligibility) query.set('eligibility', eligibility);
    return query;
  }, [deferredSearch, eligibility, page, position, sport, team]);
  const query = useQuery({
    queryKey: ['players', params.toString()],
    queryFn: () => api.getPlayers(params),
  });
  const resetPage = () => setPage(1);
  const positions = Array.from(
    new Set((query.data?.items ?? []).map((player) => player.primaryPosition).filter(Boolean)),
  ).sort();

  return (
    <PageScaffold
      eyebrow="Roster"
      title="Players"
      description="Search the Nigerian player registry and filter every squad by team, sport, position and eligibility."
    >
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Search players"
            placeholder="Name, team or jersey number"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
          />
          <TextField
            select
            label="Sport"
            value={sport}
            onChange={(event) => {
              setSport(event.target.value);
              setTeam('');
              resetPage();
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All sports</MenuItem>
            {(sports.data ?? []).map((item) => (
              <MenuItem key={item.uuid} value={item.slug}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Team"
            value={team}
            onChange={(event) => {
              setTeam(event.target.value);
              resetPage();
            }}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">All teams</MenuItem>
            {(teams.data?.items ?? [])
              .filter((item) => !sport || item.sport.slug === sport)
              .map((item) => (
                <MenuItem key={item.uuid} value={item.uuid}>
                  {item.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            label="Position"
            value={position}
            onChange={(event) => {
              setPosition(event.target.value);
              resetPage();
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All positions</MenuItem>
            {positions.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Eligibility"
            value={eligibility}
            onChange={(event) => {
              setEligibility(event.target.value);
              resetPage();
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">Any status</MenuItem>
            {eligibilityOptions.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {query.isLoading && <LoadingState label="Loading players" />}
      {query.isError && <ErrorState title="Players could not be loaded." />}
      {query.data?.items.length === 0 && (
        <EmptyState
          title="No matching players"
          description="Clear or change the filters to see more players."
        />
      )}
      {query.data && query.data.total > 0 && (
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          {query.data.total} player{query.data.total === 1 ? '' : 's'}
        </Typography>
      )}
      <Stack spacing={1.5}>
        {(query.data?.items ?? []).map((player) => (
          <Button
            key={player.uuid}
            component={RouterLink}
            to={`/players/${player.uuid}`}
            variant="outlined"
            sx={{ justifyContent: 'flex-start', gap: 1.5, py: 1.5, textAlign: 'left' }}
          >
            <EntityAvatar
              entity="player"
              src={player.photoUrl}
              alt={`${player.displayName} profile`}
            />
            <Stack alignItems="flex-start" flex={1} minWidth={0}>
              <Typography fontWeight={800}>{player.displayName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {player.currentRegistration?.team.name ?? 'Unassigned team'}
                {player.currentRegistration?.jerseyNumber != null
                  ? ` · #${player.currentRegistration.jerseyNumber}`
                  : ''}
                {' · Nigeria'}
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={
                player.currentRegistration?.positionCode ||
                player.primaryPosition ||
                'Position pending'
              }
              sx={{ ml: 'auto' }}
            />
          </Button>
        ))}
      </Stack>
      {(query.data?.totalPages ?? 0) > 1 && (
        <Pagination
          count={query.data?.totalPages ?? 1}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
          sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}
        />
      )}
    </PageScaffold>
  );
}
