import { Chip, Paper, Stack, Typography } from '@mui/material';
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
      description="Official team profile, current season roster and player eligibility."
      status={query.data.status}
    >
      <Stack spacing={3}>
        <Stack spacing={2} direction="row" alignItems="center">
          <EntityAvatar
            entity="team"
            src={query.data.logoUrl}
            alt={`${query.data.name} logo`}
            sx={{ height: 72, width: 72 }}
          />
          <Stack>
            <Typography variant="h6">{query.data.shortName || query.data.name}</Typography>
            <Typography color="text.secondary">
              {publicSportName(query.data.sport)}
              {query.data.venue ? ` · ${query.data.venue.name}, ${query.data.venue.city}` : ''}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
          {(query.data.roster ?? []).map((player) => (
            <Paper
              key={player.registrationUuid}
              variant="outlined"
              sx={{ p: 1.5, minWidth: 250, flex: '1 1 280px' }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <EntityAvatar entity="player" src={player.photoUrl} alt={player.displayName} />
                <Stack flex={1}>
                  <Typography fontWeight={850}>
                    #{player.jerseyNumber ?? '—'} {player.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {player.positionCode || player.primaryPosition || 'Position pending'} ·{' '}
                    {player.season.name}
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={player.eligibilityStatus}
                  color={player.eligibilityStatus === 'eligible' ? 'success' : 'warning'}
                />
              </Stack>
            </Paper>
          ))}
        </Stack>
        {!query.data.roster?.length && (
          <Typography color="text.secondary">
            No active roster has been published for this team.
          </Typography>
        )}
      </Stack>
    </PageScaffold>
  );
}
