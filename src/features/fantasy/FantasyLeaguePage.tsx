import { Box, Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

export function FantasyLeaguePage() {
  const api = useApi();
  const { uuid = '00000000-0000-4000-8000-000000000150' } = useParams();
  const league = useQuery({
    queryKey: ['fantasy', 'league', uuid],
    queryFn: () => api.getFantasyLeague(uuid),
  });

  return (
    <PageScaffold
      eyebrow="Fantasy"
      title={league.data?.name ?? 'Fantasy league'}
      description="Public and private league rankings with rank movement."
      status="Fantasy league"
    >
      {league.isLoading ? <LoadingState label="Loading league table" /> : null}
      {league.isError ? <ErrorState description="League is private or unavailable." /> : null}
      {league.data ? (
        <Box className="instascore-panel">
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label={league.data.visibility}
              color={league.data.visibility === 'private' ? 'warning' : 'success'}
            />
            {league.data.inviteCode ? <Chip label={`Invite ${league.data.inviteCode}`} /> : null}
          </Stack>
          {league.data.table?.length ? (
            league.data.table.map((row) => (
              <Stack
                key={row.userName}
                direction="row"
                justifyContent="space-between"
                sx={{ py: 1 }}
              >
                <Typography>
                  #{row.rank} {row.userName}
                </Typography>
                <Typography>
                  {row.points} pts ·{' '}
                  {row.movement > 0
                    ? `▲${row.movement}`
                    : row.movement < 0
                      ? `▼${Math.abs(row.movement)}`
                      : '—'}
                </Typography>
              </Stack>
            ))
          ) : (
            <EmptyState
              title="No league members ranked yet"
              description="Members appear after squads start scoring."
            />
          )}
        </Box>
      ) : null}
    </PageScaffold>
  );
}
