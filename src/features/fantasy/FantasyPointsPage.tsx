import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

export function FantasyPointsPage() {
  const api = useApi();
  const [selectedGameUuid, setSelectedGameUuid] = useState('');
  const games = useQuery({ queryKey: ['fantasy', 'games'], queryFn: api.getFantasyGames });
  const activeGameUuid = selectedGameUuid || games.data?.[0]?.uuid || '';
  const points = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'points'],
    queryFn: () => api.getFantasyPoints(activeGameUuid),
    enabled: Boolean(activeGameUuid),
  });
  const live = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'live'],
    queryFn: () => api.getFantasyLiveTracker(activeGameUuid),
    enabled: Boolean(activeGameUuid),
  });

  return (
    <PageScaffold
      eyebrow="Fantasy"
      title="Points breakdown"
      description="Track provisional live points, confirmed points and revision history."
      status="Fantasy"
    >
      {points.isLoading ? <LoadingState label="Loading fantasy points" /> : null}
      {points.isError ? <ErrorState description="Fantasy points could not be loaded." /> : null}
      <Stack spacing={3}>
        <TextField
          select
          label="Fantasy competition"
          value={activeGameUuid}
          onChange={(event) => setSelectedGameUuid(event.target.value)}
        >
          {(games.data ?? []).map((game) => (
            <MenuItem key={game.uuid} value={game.uuid}>
              {game.name}
            </MenuItem>
          ))}
        </TextField>
        <Box className="instascore-panel">
          <Typography variant="h3">Live fantasy tracker</Typography>
          {live.data?.length ? (
            live.data.map((row) => (
              <Stack
                key={row.playerName}
                direction="row"
                justifyContent="space-between"
                sx={{ py: 1 }}
              >
                <Typography>{row.playerName}</Typography>
                <Chip
                  label={`${row.points} pts · ${row.status}`}
                  color={row.status === 'confirmed' ? 'success' : 'warning'}
                />
              </Stack>
            ))
          ) : (
            <EmptyState
              title="No live fantasy points yet"
              description="Live provisional totals appear once match events are reduced."
            />
          )}
        </Box>
        <Box className="instascore-panel">
          <Typography variant="h3">Scoring breakdown</Typography>
          {points.data?.length ? (
            points.data.map((row) => (
              <Stack
                key={row.uuid}
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                sx={{ py: 1 }}
              >
                <Typography fontWeight={900}>{row.playerName}</Typography>
                <Typography>{row.points} points</Typography>
                <Chip label={`${row.status} · r${row.revision}`} />
              </Stack>
            ))
          ) : (
            <EmptyState
              title="No point revisions yet"
              description="Player scoring events appear here after the opening match begins."
            />
          )}
        </Box>
      </Stack>
    </PageScaffold>
  );
}
