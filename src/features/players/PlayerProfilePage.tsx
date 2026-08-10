import { Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import { publicSportName } from '../../utils/publicSportName';

export function PlayerProfilePage() {
  const { uuid = '' } = useParams();
  const api = useApi();
  const query = useQuery({
    queryKey: ['player', uuid],
    queryFn: () => api.getPlayer(uuid),
    enabled: !!uuid,
  });
  if (query.isLoading) return <LoadingState label="Loading player" />;
  if (query.isError || !query.data)
    return <ErrorState title="Player profile could not be loaded." />;
  return (
    <PageScaffold
      eyebrow={publicSportName(query.data.sport) || 'Player'}
      title={query.data.displayName}
      description="Public player profile with historical team-season registrations."
      status={query.data.eligibilityStatus}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <EntityAvatar
            entity="player"
            src={query.data.photoUrl}
            alt={`${query.data.displayName} profile`}
            sx={{ height: 72, width: 72 }}
          />
          <Stack>
            <Typography variant="h6">{query.data.primaryPosition || 'Position pending'}</Typography>
            <Typography color="text.secondary">
              Team comes from registrations, not the player record.
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={1}>
          {(query.data.registrations ?? []).map((registration) => (
            <Chip
              key={registration.uuid}
              label={`${registration.team.name} · ${registration.season.name} · #${registration.jerseyNumber ?? 'unassigned'}`}
              variant="outlined"
            />
          ))}
        </Stack>
      </Stack>
    </PageScaffold>
  );
}
