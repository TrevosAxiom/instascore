import { Button, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import { SportSwitcher } from '../../components/SportSwitcher';
import { publicSportName } from '../../utils/publicSportName';

export function TeamDirectoryPage() {
  const api = useApi();
  const [sport, setSport] = useState('');
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const query = useQuery({
    queryKey: ['teams', sport],
    queryFn: () => api.getTeams(new URLSearchParams(sport ? { sport } : {})),
  });
  return (
    <PageScaffold
      eyebrow="Clubs"
      title="Teams"
      description="Browse InstaScore teams and open public team profiles."
      status="Public directory"
    >
      <SportSwitcher sports={sports.data ?? []} value={sport} onChange={setSport} />
      {query.isLoading && <LoadingState label="Loading teams" />}
      {query.isError && <ErrorState title="Teams could not be loaded." />}
      {query.data?.items.length === 0 && (
        <EmptyState title="No teams yet" description="Create teams from the administration area." />
      )}
      <Stack spacing={1.5}>
        {(query.data?.items ?? []).map((team) => (
          <Button
            key={team.uuid}
            component={RouterLink}
            to={`/teams/${team.uuid}`}
            variant="outlined"
            sx={{ justifyContent: 'flex-start', gap: 1.5, py: 1.5 }}
          >
            <EntityAvatar entity="team" src={team.logoUrl} alt={`${team.name} logo`} />
            <Stack alignItems="flex-start">
              <Typography>{team.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {publicSportName(team.sport) || 'Sport pending'}
              </Typography>
            </Stack>
          </Button>
        ))}
      </Stack>
    </PageScaffold>
  );
}
