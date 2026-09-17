import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

export function FantasyTransfersPage() {
  const api = useApi();
  const client = useQueryClient();
  const [selectedGameUuid, setSelectedGameUuid] = useState('');
  const [outUuid, setOutUuid] = useState('');
  const [inUuid, setInUuid] = useState('');
  const games = useQuery({ queryKey: ['fantasy', 'games'], queryFn: api.getFantasyGames });
  const activeGameUuid = selectedGameUuid || games.data?.[0]?.uuid || '';
  const squad = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'squad'],
    queryFn: () => api.getFantasySquad(activeGameUuid),
    enabled: Boolean(activeGameUuid),
  });
  const players = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'transfer-pool'],
    queryFn: () =>
      api.getFantasyPlayers(
        activeGameUuid,
        new URLSearchParams({ sort: 'points', status: 'available' }),
      ),
    enabled: Boolean(activeGameUuid),
  });
  const outgoing = squad.data?.squad?.players.find((entry) => entry.fantasyPlayerUuid === outUuid);
  const selectedIds = useMemo(
    () => new Set(squad.data?.squad?.players.map((entry) => entry.fantasyPlayerUuid) ?? []),
    [squad.data?.squad?.players],
  );
  const incomingOptions =
    players.data?.filter(
      (player) =>
        !selectedIds.has(player.uuid) &&
        (!outgoing?.position?.code || player.position.code === outgoing.position.code),
    ) ?? [];
  const incoming = incomingOptions.find((player) => player.uuid === inUuid);
  const priceChange = (incoming?.priceCents ?? 0) - (outgoing?.priceCents ?? 0);
  const transfer = useMutation({
    mutationFn: () =>
      api.makeFantasyTransfer(activeGameUuid, {
        outFantasyPlayerUuid: outUuid,
        inFantasyPlayerUuid: inUuid,
        baseRevision: squad.data?.squad?.revision ?? 0,
      }),
    onSuccess: () => {
      setOutUuid('');
      setInUuid('');
      void client.invalidateQueries({ queryKey: ['fantasy', activeGameUuid, 'squad'] });
      void client.invalidateQueries({ queryKey: ['fantasy', activeGameUuid, 'points'] });
    },
  });

  return (
    <PageScaffold
      eyebrow="Fantasy"
      title="Transfer market"
      description="Replace a player with another from the same fantasy position before the gameweek deadline."
      status="Fantasy"
    >
      <Stack spacing={3}>
        <TextField
          select
          label="Fantasy competition"
          value={activeGameUuid}
          onChange={(event) => {
            setSelectedGameUuid(event.target.value);
            setOutUuid('');
            setInUuid('');
          }}
        >
          {(games.data ?? []).map((game) => (
            <MenuItem key={game.uuid} value={game.uuid}>
              {game.name}
            </MenuItem>
          ))}
        </TextField>
        {squad.isLoading || players.isLoading ? (
          <LoadingState label="Loading transfer market" />
        ) : null}
        {squad.isError || players.isError ? (
          <ErrorState description="Transfer market could not be loaded." />
        ) : null}
        {!squad.isLoading && !squad.data?.squad ? (
          <EmptyState
            title="Submit your squad first"
            description="Transfers become available after your first complete squad has been submitted."
          />
        ) : null}
        {squad.data?.squad ? (
          <Box className="instascore-panel">
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                <Box>
                  <Typography variant="h3">Make a transfer</Typography>
                  <Typography color="text.secondary">
                    Your first transfer is free. Further moves cost four fantasy points.
                  </Typography>
                </Box>
                <Chip
                  label={`${money(squad.data.squad.remainingBudget)} available`}
                  color="primary"
                />
              </Stack>
              <TextField
                select
                label="Player out"
                value={outUuid}
                onChange={(event) => {
                  setOutUuid(event.target.value);
                  setInUuid('');
                }}
              >
                {squad.data.squad.players.map((entry) => (
                  <MenuItem key={entry.fantasyPlayerUuid} value={entry.fantasyPlayerUuid}>
                    {entry.player?.name} · {entry.position?.name} · {money(entry.priceCents ?? 0)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Player in"
                value={inUuid}
                disabled={!outUuid}
                onChange={(event) => setInUuid(event.target.value)}
                helperText={
                  outgoing
                    ? `Showing ${outgoing.position?.name} replacements only`
                    : 'Choose the player to transfer out first'
                }
              >
                {incomingOptions.map((player) => (
                  <MenuItem key={player.uuid} value={player.uuid}>
                    {player.player.name} · {player.team.name} · {player.totalPoints} pts ·{' '}
                    {money(player.priceCents)}
                  </MenuItem>
                ))}
              </TextField>
              {outgoing && incoming ? (
                <Alert
                  severity={priceChange <= squad.data.squad.remainingBudget ? 'info' : 'error'}
                >
                  {incoming.player.name} is{' '}
                  {priceChange >= 0
                    ? `${money(priceChange)} more expensive`
                    : `${money(Math.abs(priceChange))} cheaper`}
                  .
                </Alert>
              ) : null}
              <Button
                variant="contained"
                onClick={() => transfer.mutate()}
                disabled={
                  !outUuid ||
                  !inUuid ||
                  transfer.isPending ||
                  priceChange > squad.data.squad.remainingBudget
                }
              >
                Confirm transfer
              </Button>
              {transfer.data ? (
                <Alert severity="success">
                  {transfer.data.outPlayerName} replaced by {transfer.data.inPlayerName} · cost{' '}
                  {transfer.data.costPoints} points
                </Alert>
              ) : null}
              {transfer.isError ? (
                <Alert severity="error">
                  Transfer rejected. Check the deadline, budget, position and team limits.
                </Alert>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </PageScaffold>
  );
}

function money(cents: number) {
  return `₦${Math.round(cents / 100).toLocaleString()}`;
}
