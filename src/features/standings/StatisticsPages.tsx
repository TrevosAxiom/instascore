import { Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

const statOptions = [
  'touchdowns',
  'passing_touchdowns',
  'rushing_touchdowns',
  'receiving_touchdowns',
  'interceptions',
  'safeties',
  'flag_pulls',
  'penalties',
  'player_of_the_match',
] as const;

export function TeamStatisticsPage() {
  const { uuid = '' } = useParams();
  const api = useApi();
  const query = useQuery({
    queryKey: ['team-statistics', uuid],
    queryFn: () => api.getTeamStatistics(uuid),
    enabled: Boolean(uuid),
  });

  return (
    <PageScaffold
      eyebrow="Stats"
      title="Team Statistics"
      description="Derived from confirmed match events."
      status="Statistics"
    >
      {query.isLoading && <LoadingState label="Loading team statistics" />}
      {query.isError && <ErrorState title="Team statistics could not be loaded." />}
      {query.data?.length === 0 && (
        <EmptyState
          title="No team stats yet"
          description="Confirm scored fixtures to populate this screen."
        />
      )}
      <Stack spacing={1.25}>
        {query.data?.map((stat) => (
          <Card key={stat.statKey} variant="outlined">
            <CardContent>
              <Typography variant="overline">{stat.statKey.replaceAll('_', ' ')}</Typography>
              <Typography variant="h4">{stat.statValue}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </PageScaffold>
  );
}

export function PlayerLeadersPage() {
  const [stat, setStat] = useState<(typeof statOptions)[number]>('touchdowns');
  const api = useApi();
  const query = useQuery({
    queryKey: ['player-leaders', stat],
    queryFn: () => api.getPlayerLeaders(stat),
  });

  return (
    <PageScaffold
      eyebrow="Leaders"
      title="Player Statistics"
      description="Flag-football leaders from confirmed match events."
      status="Statistics"
    >
      <TextField
        select
        fullWidth
        label="Statistic"
        value={stat}
        onChange={(event) => setStat(event.target.value as (typeof statOptions)[number])}
        sx={{ mb: 2 }}
      >
        {statOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option.replaceAll('_', ' ')}
          </MenuItem>
        ))}
      </TextField>
      {query.isLoading && <LoadingState label="Loading leaders" />}
      {query.isError && <ErrorState title="Player leaders could not be loaded." />}
      {query.data?.length === 0 && (
        <EmptyState
          title="No leaders yet"
          description="Player-attributed events will appear here after confirmation."
        />
      )}
      <Stack spacing={1.25}>
        {query.data?.map((leader, index) => (
          <Card key={`${leader.player.uuid}-${leader.statKey}`} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={900}>
                  {index + 1}. {leader.player.name}
                </Typography>
                <Typography color="primary" fontWeight={900}>
                  {leader.statValue}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {leader.team?.name ?? 'Unassigned'}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </PageScaffold>
  );
}
