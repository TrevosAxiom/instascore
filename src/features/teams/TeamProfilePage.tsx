import { Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import { publicSportName } from '../../utils/publicSportName';

export function TeamProfilePage() {
  const { uuid = '' } = useParams();
  const api = useApi();
  const query = useQuery({
    queryKey: ['team', uuid],
    queryFn: () => api.getTeam(uuid),
    enabled: !!uuid,
  });
  if (query.isLoading) return <LoadingState label="Loading team" />;
  if (query.isError || !query.data) return <ErrorState title="Team profile could not be loaded." />;
  return (
    <PageScaffold
      eyebrow={publicSportName(query.data.sport) || 'Team'}
      title={query.data.name}
      description="Public team profile. Fixtures and live scoring arrive in later milestones."
      status={query.data.status}
    >
      <Stack spacing={2} direction="row" alignItems="center">
        <EntityAvatar
          entity="team"
          src={query.data.logoUrl}
          alt={`${query.data.name} logo`}
          sx={{ height: 72, width: 72 }}
        />
        <Stack>
          <Typography variant="h6">{query.data.shortName || query.data.name}</Typography>
          <Typography color="text.secondary">{publicSportName(query.data.sport)}</Typography>
        </Stack>
      </Stack>
    </PageScaffold>
  );
}
