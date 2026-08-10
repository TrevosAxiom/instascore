import { Box, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { EmbedShell } from './EmbedShell';

export function TableWidgetPage() {
  const api = useApi();
  const { competitionUuid = '' } = useParams();
  const query = useQuery({
    queryKey: ['embed-table', competitionUuid],
    queryFn: () => api.getStandings(competitionUuid),
    enabled: Boolean(competitionUuid),
  });

  return (
    <EmbedShell title="Table widget">
      {query.isLoading && <LoadingState label="Loading table" />}
      {query.isError && <ErrorState description="League table is unavailable." />}
      {query.data?.length === 0 && (
        <EmptyState
          title="No table yet"
          description="Confirmed results will populate this widget."
        />
      )}
      {query.data && query.data.length > 0 && (
        <Stack spacing={1}>
          {query.data.slice(0, 8).map((row) => (
            <Box
              key={row.uuid}
              sx={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr 3rem',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Typography fontWeight={900}>{row.position}</Typography>
              <Typography>{row.team.name}</Typography>
              <Typography fontWeight={950} textAlign="right">
                {row.points}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </EmbedShell>
  );
}
