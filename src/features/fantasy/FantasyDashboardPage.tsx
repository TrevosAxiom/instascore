import { Alert, Box, Button, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import type { FantasyPlayer, FantasySquadEntry } from '../../types/api';

export function FantasyDashboardPage() {
  const api = useApi();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGameUuid, setSelectedGameUuid] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<FantasySquadEntry[]>([]);
  const games = useQuery({ queryKey: ['fantasy', 'games'], queryFn: api.getFantasyGames });
  const activeGameUuid = selectedGameUuid || games.data?.[0]?.uuid || '';
  const players = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'players', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
      return api.getFantasyPlayers(activeGameUuid, params);
    },
    enabled: Boolean(activeGameUuid),
  });
  const squad = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'squad'],
    queryFn: () => api.getFantasySquad(activeGameUuid),
    enabled: Boolean(activeGameUuid && state?.authenticated),
  });
  const squadEntries = draft.length ? draft : (squad.data?.squad?.players ?? []);
  const selectedIds = new Set(squadEntries.map((entry) => entry.fantasyPlayerUuid));
  const budgetCents = squad.data?.game.budgetCents ?? games.data?.[0]?.budgetCents ?? 0;
  const totalCost = useMemo(
    () => squadEntries.reduce((sum, entry) => sum + (entry.priceCents ?? 0), 0),
    [squadEntries],
  );
  const remaining = Math.max(0, budgetCents - totalCost);
  const save = useMutation({
    mutationFn: (submit: boolean) => {
      const payload = {
        name: squad.data?.squad?.name ?? 'My InstaScore Squad',
        baseRevision: squad.data?.squad?.revision ?? 0,
        players: squadEntries,
      };
      return submit
        ? api.submitFantasySquad(activeGameUuid, payload)
        : api.saveFantasySquad(activeGameUuid, payload);
    },
    onSuccess: (data) => {
      setDraft([]);
      queryClient.setQueryData(['fantasy', activeGameUuid, 'squad'], data);
    },
  });

  return (
    <PageScaffold
      eyebrow="Fantasy"
      title="Fantasy dashboard"
      description="Build a budget-safe squad, choose a formation, captain and vice-captain before the gameweek deadline."
      status="Fantasy"
    >
      {games.isLoading ? <LoadingState label="Loading fantasy games" /> : null}
      {games.isError ? <ErrorState description="Fantasy games could not be loaded." /> : null}
      {games.data?.length === 0 ? (
        <EmptyState
          title="No fantasy games open yet"
          description="A fantasy administrator needs to publish a game before fans can build squads."
        />
      ) : null}
      {activeGameUuid ? (
        <Stack spacing={3}>
          {!state?.authenticated ? (
            <Alert severity="info">Sign in to save or submit your fantasy squad.</Alert>
          ) : null}
          <Box className="instascore-panel">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Fantasy game"
                value={activeGameUuid}
                SelectProps={{ native: true }}
                onChange={(event) => setSelectedGameUuid(event.target.value)}
                fullWidth
              >
                {games.data?.map((game) => (
                  <option key={game.uuid} value={game.uuid}>
                    {game.name}
                  </option>
                ))}
              </TextField>
              <TextField
                label="Player search"
                placeholder="Search players or teams"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                fullWidth
              />
            </Stack>
          </Box>
          <Box className="instascore-panel">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Chip label={`Budget ${money(budgetCents)}`} color="primary" />
              <Chip
                label={`Remaining ${money(remaining)}`}
                color={remaining > 0 ? 'success' : 'warning'}
              />
              <Chip label={`Selected ${squadEntries.length}`} />
              <Chip label={`Revision ${squad.data?.squad?.revision ?? 0}`} />
              {squad.data?.gameweek.locked ? <Chip label="Squad locked" color="error" /> : null}
            </Stack>
          </Box>
          <Box className="instascore-panel">
            <Typography variant="h3">Formation view</Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {squadEntries.length ? (
                squadEntries.map((entry) => (
                  <Typography key={entry.fantasyPlayerUuid}>
                    {entry.slotType === 'starting' ? 'XI' : 'Bench'} {entry.slotNumber}:{' '}
                    {entry.player?.name ?? entry.fantasyPlayerUuid}
                    {entry.isCaptain ? ' · Captain' : ''}
                    {entry.isViceCaptain ? ' · Vice-captain' : ''}
                  </Typography>
                ))
              ) : (
                <EmptyState
                  title="No players selected"
                  description="Pick players from the pool to start building your squad."
                />
              )}
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                disabled={!state?.authenticated || save.isPending}
                onClick={() => save.mutate(false)}
              >
                Save draft
              </Button>
              <Button
                variant="outlined"
                disabled={!state?.authenticated || save.isPending}
                onClick={() => save.mutate(true)}
              >
                Submit squad
              </Button>
            </Stack>
            {save.isError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                Squad rejected by server validation. Check budget, formation, captain, team limits,
                deadline or revision.
              </Alert>
            ) : null}
          </Box>
          <Box className="instascore-panel">
            <Typography variant="h3">Player pool</Typography>
            <Stack divider={<Divider />} sx={{ mt: 2 }}>
              {players.data?.map((player) => (
                <PlayerRow
                  key={player.uuid}
                  player={player}
                  selected={selectedIds.has(player.uuid)}
                  onToggle={() => togglePlayer(player)}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      ) : null}
    </PageScaffold>
  );

  function togglePlayer(player: FantasyPlayer) {
    setDraft((current) => {
      const base = current.length ? current : (squad.data?.squad?.players ?? []);
      if (base.some((entry) => entry.fantasyPlayerUuid === player.uuid)) {
        return base.filter((entry) => entry.fantasyPlayerUuid !== player.uuid);
      }
      return [
        ...base,
        {
          fantasyPlayerUuid: player.uuid,
          slotType: base.length < (squad.data?.game.startingSize ?? 7) ? 'starting' : 'bench',
          slotNumber: base.length + 1,
          isCaptain: base.length === 0,
          isViceCaptain: base.length === 1,
          priceCents: player.priceCents,
          position: player.position,
          player: player.player,
          team: player.team,
        },
      ];
    });
  }
}

function PlayerRow({
  player,
  selected,
  onToggle,
}: {
  player: FantasyPlayer;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ py: 1.5 }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography fontWeight={900}>{player.player.name}</Typography>
        <Typography color="text.secondary">
          {player.team.name} · {player.position.name} · {money(player.priceCents)}
        </Typography>
      </Box>
      <Button variant={selected ? 'outlined' : 'contained'} onClick={onToggle}>
        {selected ? 'Remove' : 'Select'}
      </Button>
    </Stack>
  );
}

function money(cents: number) {
  return `₦${Math.round(cents / 100).toLocaleString()}`;
}
