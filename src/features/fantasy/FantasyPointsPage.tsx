import { Box, Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

const demoGameUuid = '00000000-0000-4000-8000-000000000120';

export function FantasyPointsPage() {
  const api = useApi();
  const points = useQuery({
    queryKey: ['fantasy', demoGameUuid, 'points'],
    queryFn: () => api.getFantasyPoints(demoGameUuid),
  });
  const live = useQuery({
    queryKey: ['fantasy', demoGameUuid, 'live'],
    queryFn: () => api.getFantasyLiveTracker(demoGameUuid),
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
          <Typography variant="h3">Revision history</Typography>
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
              description="Recalculations and admin overrides will preserve older revisions here."
            />
          )}
        </Box>
      </Stack>
    </PageScaffold>
  );
}
