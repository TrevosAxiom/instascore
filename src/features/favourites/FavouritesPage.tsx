import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { readBootstrapSettings } from '../../app/bootstrap';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { readLocalFavourites, toggleLocalFavourite } from '../../favourites/localFavourites';
import { updateOneSignalTags } from '../../onesignal/oneSignalAdapter';
import type { FavouriteEntityType } from '../../types/api';

export function FavouritesPage() {
  const api = useApi();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const oneSignal = useMemo(() => readBootstrapSettings().oneSignal, []);
  const [entityUuid, setEntityUuid] = useState('');
  const [entityType, setEntityType] = useState<FavouriteEntityType>('team');
  const [localVersion, setLocalVersion] = useState(0);
  const teams = useQuery({
    queryKey: ['favourite-options', 'teams'],
    queryFn: () => api.getTeams(),
  });
  const competitions = useQuery({
    queryKey: ['favourite-options', 'competitions'],
    queryFn: () => api.getCompetitions(),
  });
  const players = useQuery({
    queryKey: ['favourite-options', 'players'],
    queryFn: () => api.getPlayers(),
  });
  const favourites = useQuery({
    queryKey: ['me', 'favourites'],
    queryFn: api.getFavourites,
    enabled: Boolean(state?.authenticated),
  });
  const feed = useQuery({
    queryKey: ['me', 'feed'],
    queryFn: api.getPersonalFeed,
    enabled: Boolean(state?.authenticated),
  });
  const alerts = useQuery({
    queryKey: ['me', 'alerts'],
    queryFn: api.getAlertHistory,
    enabled: Boolean(state?.authenticated),
  });
  const follow = useMutation({
    mutationFn: () => api.followFavourite({ entityType, entityUuid }),
    onSuccess: async () => {
      await updateOneSignalTags(
        { [`fav_${entityType}_${entityUuid.replaceAll('-', '')}`]: '1' },
        oneSignal,
      );
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const unfollow = useMutation({
    mutationFn: () => api.unfollowFavourite(entityType, entityUuid),
    onSuccess: async () => {
      await updateOneSignalTags(
        { [`fav_${entityType}_${entityUuid.replaceAll('-', '')}`]: '' },
        oneSignal,
      );
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const localFavourites = readLocalFavourites();
  const options =
    entityType === 'team'
      ? (teams.data?.items ?? []).map((team) => ({ uuid: team.uuid, label: team.name }))
      : entityType === 'competition'
        ? (competitions.data?.items ?? []).map((competition) => ({
            uuid: competition.uuid,
            label: competition.name,
          }))
        : (players.data?.items ?? []).map((player) => ({
            uuid: player.uuid,
            label: player.displayName,
          }));
  const entityNames = new Map([
    ...(teams.data?.items ?? []).map((team) => [team.uuid, team.name] as const),
    ...(competitions.data?.items ?? []).map(
      (competition) => [competition.uuid, competition.name] as const,
    ),
    ...(players.data?.items ?? []).map((player) => [player.uuid, player.displayName] as const),
  ]);
  void localVersion;

  return (
    <PageScaffold
      eyebrow="Personal"
      title="Favourites"
      description="Follow teams, competitions and players to shape your scores feed and alerts."
    >
      <Stack spacing={3}>
        {!state?.authenticated ? (
          <Alert severity="info">
            You are using anonymous local favourites. They will migrate into your profile after
            login.
          </Alert>
        ) : null}

        <Box className="instascore-panel">
          <Typography variant="h3">Follow something</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              SelectProps={{ native: true }}
              label="Type"
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value as FavouriteEntityType);
                setEntityUuid('');
              }}
            >
              <option value="team">Team</option>
              <option value="competition">Competition</option>
              <option value="player">Player</option>
            </TextField>
            <TextField
              select
              SelectProps={{ native: true }}
              label={
                entityType === 'competition'
                  ? 'Competition'
                  : entityType === 'player'
                    ? 'Player'
                    : 'Team'
              }
              value={entityUuid}
              onChange={(event) => setEntityUuid(event.target.value)}
              fullWidth
              helperText={
                options.length
                  ? 'Choose who you want to follow.'
                  : `No ${entityType}s are available yet.`
              }
            >
              <option value="">Select {entityType}</option>
              {options.map((option) => (
                <option key={option.uuid} value={option.uuid}>
                  {option.label}
                </option>
              ))}
            </TextField>
            {state?.authenticated ? (
              <>
                <Button
                  variant="contained"
                  onClick={() => follow.mutate()}
                  disabled={follow.isPending || !entityUuid}
                >
                  Follow
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => unfollow.mutate()}
                  disabled={unfollow.isPending || !entityUuid}
                >
                  Unfollow
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                disabled={!entityUuid}
                onClick={() => {
                  toggleLocalFavourite(entityType, entityUuid);
                  setLocalVersion((value) => value + 1);
                }}
              >
                Toggle locally
              </Button>
            )}
          </Stack>
        </Box>

        {state?.authenticated ? (
          <>
            {favourites.isLoading ? <LoadingState label="Loading favourites" /> : null}
            {favourites.isError ? (
              <ErrorState description="Favourites could not be loaded." />
            ) : null}
            <Box className="instascore-panel">
              <Typography variant="h3">Your follows</Typography>
              {favourites.data?.length ? (
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                  {favourites.data.map((favourite) => (
                    <Chip
                      key={`${favourite.entity_type}-${favourite.entity_uuid}`}
                      label={`${favourite.entity_type}: ${entityNames.get(favourite.entity_uuid ?? '') ?? 'Saved favourite'}`}
                    />
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  title="Your feed is waiting"
                  description="Follow a team, competition or player to personalise scores and alerts."
                />
              )}
            </Box>
            <Box className="instascore-panel">
              <Typography variant="h3">Personal scores feed</Typography>
              {feed.data?.suggestions.map((suggestion) => (
                <Typography key={suggestion.label} color="text.secondary">
                  {suggestion.label}
                </Typography>
              ))}
            </Box>
            <Box className="instascore-panel">
              <Typography variant="h3">Alert history</Typography>
              {alerts.data?.length ? (
                alerts.data.map((alert) => (
                  <Typography key={alert.uuid}>
                    {alert.title} — {alert.delivery_status}
                  </Typography>
                ))
              ) : (
                <Typography color="text.secondary">No alerts recorded yet.</Typography>
              )}
            </Box>
          </>
        ) : (
          <Box className="instascore-panel">
            <Typography variant="h3">Local favourites</Typography>
            {localFavourites.length ? (
              localFavourites.map((favourite) => (
                <Typography key={`${favourite.entityType}-${favourite.entityUuid}`}>
                  {favourite.entityType}:{' '}
                  {entityNames.get(favourite.entityUuid ?? '') ?? 'Saved favourite'}
                </Typography>
              ))
            ) : (
              <EmptyState
                title="No local favourites yet"
                description="Save a favourite here, then sign in later to migrate it safely."
              />
            )}
          </Box>
        )}
      </Stack>
    </PageScaffold>
  );
}
