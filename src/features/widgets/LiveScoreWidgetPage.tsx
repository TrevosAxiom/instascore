import { Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { useLiveMatchStream } from '../../realtime/useLiveMatchStream';
import { LiveScoreboard } from '../scoring/LiveScoreboard';
import { EmbedShell } from './EmbedShell';

export function LiveScoreWidgetPage() {
  const api = useApi();
  const { uuid = '' } = useParams();
  const stream = useLiveMatchStream(api, uuid);
  const fallback = useQuery({
    queryKey: ['embed-live-match', uuid],
    queryFn: () => api.getLiveMatch(uuid),
    enabled: Boolean(uuid),
    refetchInterval: () => (stream.transport === 'sse' ? false : 10000),
  });
  const state = stream.state ?? fallback.data;

  return (
    <EmbedShell title="Live widget">
      {fallback.isLoading && !state && <LoadingState label="Loading live score" />}
      {fallback.isError && !state && <ErrorState description="Live score is unavailable." />}
      {state && (
        <Stack spacing={1.5}>
          <Chip
            label={stream.transport === 'sse' ? 'Live' : 'Auto-refresh'}
            color={stream.transport === 'sse' ? 'success' : 'primary'}
            sx={{ alignSelf: 'flex-start' }}
          />
          <LiveScoreboard state={state} />
          <Typography variant="caption" color="text.secondary">
            Provisional until confirmed by the competition administrator.
          </Typography>
        </Stack>
      )}
    </EmbedShell>
  );
}
