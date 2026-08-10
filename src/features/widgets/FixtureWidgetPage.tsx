import { Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { fixtureTitle, formatKickoff, statusLabel } from '../fixtures/fixtureFormat';
import { EmbedShell } from './EmbedShell';

export function FixtureWidgetPage() {
  const api = useApi();
  const { uuid = '' } = useParams();
  const query = useQuery({
    queryKey: ['embed-fixture', uuid],
    queryFn: () => api.getFixture(uuid),
    enabled: Boolean(uuid),
  });

  return (
    <EmbedShell title="Fixture widget">
      {query.isLoading && <LoadingState label="Loading fixture" />}
      {query.isError && <ErrorState description="Fixture is unavailable." />}
      {query.data && (
        <Stack spacing={1.5}>
          <Chip
            label={statusLabel(query.data.status)}
            color="primary"
            sx={{ alignSelf: 'flex-start' }}
          />
          <Typography variant="h5" fontWeight={950}>
            {fixtureTitle(query.data)}
          </Typography>
          <Typography>{formatKickoff(query.data)}</Typography>
          <Typography color="text.secondary">
            {query.data.competition.name} · {query.data.venue?.name ?? 'Venue TBC'}
          </Typography>
        </Stack>
      )}
    </EmbedShell>
  );
}
