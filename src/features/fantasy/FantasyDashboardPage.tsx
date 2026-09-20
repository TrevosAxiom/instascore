import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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
  const [position, setPosition] = useState('');
  const [team, setTeam] = useState('');
  const [sort, setSort] = useState('points');
  const [draft, setDraft] = useState<FantasySquadEntry[] | null>(null);
  const [focusedPlayerUuid, setFocusedPlayerUuid] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const games = useQuery({ queryKey: ['fantasy', 'games'], queryFn: api.getFantasyGames });
  const activeGameUuid = selectedGameUuid || games.data?.[0]?.uuid || '';
  const activeGame = games.data?.find((game) => game.uuid === activeGameUuid);
  const playerParams = useMemo(() => {
    const params = new URLSearchParams({ sort });
    if (search.trim()) params.set('search', search.trim());
    if (position) params.set('position', position);
    if (team) params.set('team', team);
    return params;
  }, [position, search, sort, team]);
  const players = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'players', playerParams.toString()],
    queryFn: () => api.getFantasyPlayers(activeGameUuid, playerParams),
    enabled: Boolean(activeGameUuid),
  });
  const squad = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'squad'],
    queryFn: () => api.getFantasySquad(activeGameUuid),
    enabled: Boolean(activeGameUuid && state?.authenticated),
  });
  const leagues = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'leagues'],
    queryFn: () => api.getFantasyLeagues(activeGameUuid),
    enabled: Boolean(activeGameUuid && state?.authenticated),
  });
  const squadEntries = draft ?? squad.data?.squad?.players ?? [];
  const selectedIds = new Set(squadEntries.map((entry) => entry.fantasyPlayerUuid));
  const game = squad.data?.game ?? activeGame;
  const budgetCents = game?.budgetCents ?? 0;
  const totalCost = squadEntries.reduce((sum, entry) => sum + (entry.priceCents ?? 0), 0);
  const remaining = budgetCents - totalCost;
  const starting = squadEntries.filter((entry) => entry.slotType === 'starting');
  const bench = squadEntries.filter((entry) => entry.slotType === 'bench');
  const positions = uniqueBy(players.data ?? [], (player) => player.position.code);
  const teams = uniqueBy(players.data ?? [], (player) => player.team.uuid);
  const isComplete =
    squadEntries.length === game?.squadSize && starting.length === game.startingSize;
  const save = useMutation({
    mutationFn: (submit: boolean) => {
      const payload = {
        name: squad.data?.squad?.name ?? 'My InstaScore Squad',
        baseRevision: squad.data?.squad?.revision ?? 0,
        players: renumber(squadEntries),
      };
      return submit
        ? api.submitFantasySquad(activeGameUuid, payload)
        : api.saveFantasySquad(activeGameUuid, payload);
    },
    onSuccess: (data) => {
      setDraft(null);
      queryClient.setQueryData(['fantasy', activeGameUuid, 'squad'], data);
    },
  });
  const createLeague = useMutation({
    mutationFn: () =>
      api.createFantasyLeague(activeGameUuid, { name: leagueName, visibility: 'private' }),
    onSuccess: () => {
      setLeagueName('');
      void queryClient.invalidateQueries({ queryKey: ['fantasy', activeGameUuid, 'leagues'] });
    },
  });
  const joinLeague = useMutation({
    mutationFn: () => api.joinFantasyLeague(inviteCode),
    onSuccess: () => {
      setInviteCode('');
      void queryClient.invalidateQueries({ queryKey: ['fantasy', activeGameUuid, 'leagues'] });
    },
  });

  return (
    <PageScaffold
      eyebrow="Fantasy"
      title="Fantasy team"
      description="Build your flag-football squad, organise the starting seven and choose your captain before the deadline."
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
      {activeGameUuid && game ? (
        <Stack spacing={3}>
          {!state?.authenticated ? (
            <Alert severity="info">Sign in to save or submit your fantasy team.</Alert>
          ) : null}
          {state?.authenticated ? (
            <Box className="instascore-panel">
              <Typography variant="h3">Mini leagues</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Create a private competition for friends or join one with its invite code.
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                <TextField
                  label="New league name"
                  value={leagueName}
                  onChange={(event) => setLeagueName(event.target.value)}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  disabled={!leagueName.trim() || createLeague.isPending}
                  onClick={() => createLeague.mutate()}
                >
                  Create league
                </Button>
                <TextField
                  label="Invite code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  disabled={!inviteCode.trim() || joinLeague.isPending}
                  onClick={() => joinLeague.mutate()}
                >
                  Join league
                </Button>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                {leagues.data?.map((league) => (
                  <Chip
                    key={league.uuid}
                    label={`${league.name}${league.isMember ? ' · Joined' : ''}`}
                    color={league.isMember ? 'primary' : 'default'}
                  />
                ))}
              </Stack>
              {createLeague.isError || joinLeague.isError ? (
                <Alert severity="error">
                  The league request failed. Check the name or invite code and try again.
                </Alert>
              ) : null}
            </Box>
          ) : null}
          <Box className="instascore-panel">
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
              <TextField
                select
                label="Fantasy competition"
                value={activeGameUuid}
                onChange={(event) => {
                  setSelectedGameUuid(event.target.value);
                  setDraft(null);
                }}
                sx={{ minWidth: 260 }}
              >
                {(games.data ?? []).map((item) => (
                  <MenuItem key={item.uuid} value={item.uuid}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                <Chip label={`Budget ${money(budgetCents)}`} color="primary" />
                <Chip
                  label={`Remaining ${money(Math.max(0, remaining))}`}
                  color={remaining >= 0 ? 'success' : 'error'}
                />
                <Chip label={`${squadEntries.length}/${game.squadSize} selected`} />
                {squad.data?.gameweek.locked ? (
                  <Chip label="Locked" color="error" />
                ) : (
                  <Chip label={deadlineLabel(squad.data?.gameweek.deadlineAt)} variant="outlined" />
                )}
              </Stack>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (squadEntries.length / game.squadSize) * 100)}
              sx={{ mt: 2 }}
            />
          </Box>

          <Box
            className="instascore-panel fantasy-squad-shell"
            sx={{
              background: 'linear-gradient(145deg, rgb(7, 25, 45), rgb(12, 39, 67))',
              color: 'white',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'rgba(255,255,255,.6)', fontWeight: 900, letterSpacing: '.18em' }}
                >
                  Fantasy · {squad.data?.gameweek.name ?? 'Current gameweek'}
                </Typography>
                <Typography variant="h3" color="inherit">
                  My starting lineup
                </Typography>
                <Typography sx={{ opacity: 0.72 }}>
                  Captain scores double. Vice-captain is ready if the captain does not play.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`${starting.length}/${game.startingSize} starters`}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,.35)' }}
                  variant="outlined"
                />
                <Chip
                  label={`${bench.length}/${game.benchSize} bench`}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,.35)' }}
                  variant="outlined"
                />
              </Stack>
            </Stack>
            <FantasyPitch
              entries={starting}
              onCaptain={setCaptain}
              selectedUuid={focusedPlayerUuid}
              onSelect={setFocusedPlayerUuid}
            />
            <SelectedPlayerBar
              entry={
                starting.find((entry) => entry.fantasyPlayerUuid === focusedPlayerUuid) ??
                starting[0]
              }
              onCaptain={setCaptain}
              onBench={changeRole}
              onRemove={removePlayer}
            />
            <Accordion className="fantasy-squad-accordion" disableGutters>
              <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}>
                <Typography fontWeight={900}>
                  All {squadEntries.length} players, bench &amp; controls
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography fontWeight={900} sx={{ mb: 1, color: 'primary.main' }}>
                  STARTING TEAM
                </Typography>
                <FormationGrid
                  entries={starting}
                  onRole={changeRole}
                  onCaptain={setCaptain}
                  onRemove={removePlayer}
                />
                <Typography fontWeight={900} sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
                  BENCH
                </Typography>
                <FormationGrid
                  entries={bench}
                  onRole={changeRole}
                  onCaptain={setCaptain}
                  onRemove={removePlayer}
                />
              </AccordionDetails>
            </Accordion>
            {!squadEntries.length ? (
              <EmptyState
                title="Your pitch is empty"
                description="Select players from the market below."
              />
            ) : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                disabled={
                  !state?.authenticated ||
                  save.isPending ||
                  remaining < 0 ||
                  squad.data?.gameweek.locked
                }
                onClick={() => save.mutate(false)}
              >
                Save draft
              </Button>
              <Button
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
                disabled={
                  !state?.authenticated ||
                  save.isPending ||
                  !isComplete ||
                  remaining < 0 ||
                  squad.data?.gameweek.locked
                }
                onClick={() => save.mutate(true)}
              >
                Submit team
              </Button>
            </Stack>
            {save.isSuccess ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                Your fantasy team has been saved.
              </Alert>
            ) : null}
            {save.isError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                Team rejected. Check budget, formation, captaincy, team limits and deadline.
              </Alert>
            ) : null}
          </Box>

          <Box className="instascore-panel">
            <Typography variant="h3">Player market</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ my: 2 }}>
              <TextField
                label="Search players or teams"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Position"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">All</MenuItem>
                {positions.map((item) => (
                  <MenuItem key={item.position.code} value={item.position.code}>
                    {item.position.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Team"
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All</MenuItem>
                {teams.map((item) => (
                  <MenuItem key={item.team.uuid} value={item.team.uuid}>
                    {item.team.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="points">Points</MenuItem>
                <MenuItem value="ownership">Ownership</MenuItem>
                <MenuItem value="price">Price</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </TextField>
            </Stack>
            {players.isLoading ? <LoadingState label="Loading player market" /> : null}
            <Stack divider={<Divider />}>
              {players.data?.map((player) => (
                <PlayerRow
                  key={player.uuid}
                  player={player}
                  selected={selectedIds.has(player.uuid)}
                  disabled={!selectedIds.has(player.uuid) && squadEntries.length >= game.squadSize}
                  onToggle={() => togglePlayer(player)}
                />
              ))}
            </Stack>
            {!players.isLoading && players.data?.length === 0 ? (
              <EmptyState
                title="No players match these filters"
                description="Clear a filter or search another name."
              />
            ) : null}
          </Box>
        </Stack>
      ) : null}
    </PageScaffold>
  );

  function togglePlayer(player: FantasyPlayer) {
    if (selectedIds.has(player.uuid)) return removePlayer(player.uuid);
    if (squadEntries.length >= game!.squadSize) return;
    const starter = starting.length < game!.startingSize;
    setDraft([
      ...squadEntries,
      {
        fantasyPlayerUuid: player.uuid,
        slotType: starter ? 'starting' : 'bench',
        slotNumber: squadEntries.length + 1,
        isCaptain: starter && starting.length === 0,
        isViceCaptain: starter && starting.length === 1,
        priceCents: player.priceCents,
        position: player.position,
        player: player.player,
        team: player.team,
      },
    ]);
  }
  function removePlayer(uuid: string) {
    setDraft(squadEntries.filter((entry) => entry.fantasyPlayerUuid !== uuid));
  }
  function changeRole(uuid: string) {
    const entry = squadEntries.find((item) => item.fantasyPlayerUuid === uuid);
    if (!entry) return;
    const nextRole = entry.slotType === 'starting' ? 'bench' : 'starting';
    if (nextRole === 'starting' && starting.length >= game!.startingSize) return;
    if (nextRole === 'bench' && bench.length >= game!.benchSize) return;
    setDraft(
      squadEntries.map((item) =>
        item.fantasyPlayerUuid === uuid
          ? {
              ...item,
              slotType: nextRole,
              isCaptain: nextRole === 'bench' ? false : item.isCaptain,
              isViceCaptain: nextRole === 'bench' ? false : item.isViceCaptain,
            }
          : item,
      ),
    );
  }
  function setCaptain(uuid: string, role: 'captain' | 'vice') {
    setDraft(
      squadEntries
        .map((entry) => ({
          ...entry,
          isCaptain:
            role === 'captain'
              ? entry.fantasyPlayerUuid === uuid
              : entry.isCaptain && entry.fantasyPlayerUuid !== uuid,
          isViceCaptain:
            role === 'vice'
              ? entry.fantasyPlayerUuid === uuid
              : entry.isViceCaptain && entry.fantasyPlayerUuid !== uuid,
        }))
        .map((entry) =>
          entry.fantasyPlayerUuid === uuid
            ? { ...entry, isCaptain: role === 'captain', isViceCaptain: role === 'vice' }
            : entry,
        ),
    );
  }
}

function FantasyPitch({
  entries,
  selectedUuid,
  onSelect,
  onCaptain,
}: {
  entries: FantasySquadEntry[];
  selectedUuid: string;
  onSelect: (uuid: string) => void;
  onCaptain: (uuid: string, role: 'captain' | 'vice') => void;
}) {
  const offense = entries.filter((entry) => isOffense(entry.position?.code));
  const defense = entries.filter((entry) => !isOffense(entry.position?.code));

  return (
    <Box className="fantasy-pitch" sx={{ mt: 3 }}>
      <Box className="fantasy-pitch-word fantasy-pitch-word--top">INSTASCORE</Box>
      <Typography className="fantasy-pitch-label fantasy-pitch-label--defense">DEFENSE</Typography>
      <Box className="fantasy-pitch-unit fantasy-pitch-unit--defense">
        {defense.map((entry, index) => (
          <PitchPlayer
            key={entry.fantasyPlayerUuid}
            entry={entry}
            index={index}
            count={defense.length}
            selected={selectedUuid === entry.fantasyPlayerUuid}
            onSelect={onSelect}
            onCaptain={onCaptain}
          />
        ))}
      </Box>
      <Box className="fantasy-scrimmage">
        <span>LINE OF SCRIMMAGE</span>
      </Box>
      <Typography className="fantasy-pitch-label fantasy-pitch-label--offense">OFFENSE</Typography>
      <Box className="fantasy-pitch-unit fantasy-pitch-unit--offense">
        {offense.map((entry, index) => (
          <PitchPlayer
            key={entry.fantasyPlayerUuid}
            entry={entry}
            index={index}
            count={offense.length}
            selected={selectedUuid === entry.fantasyPlayerUuid}
            onSelect={onSelect}
            onCaptain={onCaptain}
          />
        ))}
      </Box>
      <Box className="fantasy-pitch-word fantasy-pitch-word--bottom">FANTASY</Box>
      {!entries.length ? (
        <Typography className="fantasy-pitch-empty">
          Select players below to build your lineup
        </Typography>
      ) : null}
    </Box>
  );
}

function PitchPlayer({
  entry,
  index,
  count,
  selected,
  onSelect,
  onCaptain,
}: {
  entry: FantasySquadEntry;
  index: number;
  count: number;
  selected: boolean;
  onSelect: (uuid: string) => void;
  onCaptain: (uuid: string, role: 'captain' | 'vice') => void;
}) {
  const columns = Math.min(Math.max(count, 1), 4);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const itemsInRow = Math.min(columns, count - row * columns);
  const left = ((column + 1) / (itemsInRow + 1)) * 100;
  const top = count <= 4 ? 50 : row === 0 ? 30 : 70;
  return (
    <Box
      component="button"
      type="button"
      className={`fantasy-pitch-player${selected ? ' is-selected' : ''}`}
      sx={{ left: `${left}%`, top: `${top}%` }}
      onClick={() => onSelect(entry.fantasyPlayerUuid)}
      onDoubleClick={() => onCaptain(entry.fantasyPlayerUuid, 'captain')}
      aria-label={`Select ${entry.player?.name ?? 'player'}`}
    >
      <Box className="fantasy-pitch-avatar-wrap">
        <Avatar src={entry.player?.photoUrl ?? undefined} className="fantasy-pitch-avatar">
          {entry.player?.name?.slice(0, 1)}
        </Avatar>
        {entry.isCaptain || entry.isViceCaptain ? (
          <span className="fantasy-pitch-role">{entry.isCaptain ? 'C' : 'V'}</span>
        ) : null}
      </Box>
      <strong>{shortName(entry.player?.name)}</strong>
      <small>{entry.position?.name ?? entry.position?.code}</small>
    </Box>
  );
}

function SelectedPlayerBar({
  entry,
  onCaptain,
  onBench,
  onRemove,
}: {
  entry: FantasySquadEntry | undefined;
  onCaptain: (uuid: string, role: 'captain' | 'vice') => void;
  onBench: (uuid: string) => void;
  onRemove: (uuid: string) => void;
}) {
  if (!entry) return null;
  return (
    <Stack className="fantasy-selected-player" direction={{ xs: 'column', sm: 'row' }} gap={2}>
      <Stack direction="row" gap={1.5} alignItems="center" sx={{ flex: 1 }}>
        <Box className="fantasy-selected-position">{entry.position?.code ?? '—'}</Box>
        <Box>
          <Typography fontWeight={900} color="inherit">
            {entry.player?.name}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.68 }}>
            {entry.team?.name} · Starting {entry.position?.name}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          size="small"
          variant={entry.isCaptain ? 'contained' : 'outlined'}
          onClick={() => onCaptain(entry.fantasyPlayerUuid, 'captain')}
        >
          Captain
        </Button>
        <Button
          size="small"
          variant={entry.isViceCaptain ? 'contained' : 'outlined'}
          onClick={() => onCaptain(entry.fantasyPlayerUuid, 'vice')}
        >
          Vice
        </Button>
        <Button size="small" color="inherit" onClick={() => onBench(entry.fantasyPlayerUuid)}>
          Bench
        </Button>
        <Button size="small" color="error" onClick={() => onRemove(entry.fantasyPlayerUuid)}>
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}

function FormationGrid({
  entries,
  onRole,
  onCaptain,
  onRemove,
}: {
  entries: FantasySquadEntry[];
  onRole: (uuid: string) => void;
  onCaptain: (uuid: string, role: 'captain' | 'vice') => void;
  onRemove: (uuid: string) => void;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
        gap: 1.5,
      }}
    >
      {entries.map((entry) => (
        <Box
          key={entry.fantasyPlayerUuid}
          sx={{
            p: 1.5,
            borderRadius: 2,
            background: 'rgba(255,255,255,.09)',
            border: '1px solid rgba(255,255,255,.13)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              sx={{ bgcolor: 'primary.main', color: 'secondary.contrastText', fontWeight: 900 }}
            >
              {entry.player?.name?.slice(0, 1)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={900} noWrap>
                {entry.player?.name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }} noWrap>
                {entry.position?.code} · {entry.team?.name}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant={entry.isCaptain ? 'contained' : 'outlined'}
              onClick={() => onCaptain(entry.fantasyPlayerUuid, 'captain')}
            >
              C
            </Button>
            <Button
              size="small"
              variant={entry.isViceCaptain ? 'contained' : 'outlined'}
              onClick={() => onCaptain(entry.fantasyPlayerUuid, 'vice')}
            >
              VC
            </Button>
            <Button size="small" onClick={() => onRole(entry.fantasyPlayerUuid)}>
              {entry.slotType === 'starting' ? 'Bench' : 'Start'}
            </Button>
            <Button size="small" color="error" onClick={() => onRemove(entry.fantasyPlayerUuid)}>
              Remove
            </Button>
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

function PlayerRow({
  player,
  selected,
  disabled,
  onToggle,
}: {
  player: FantasyPlayer;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ py: 1.5 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
        <Avatar src={player.player.photoUrl ?? undefined}>{player.player.name.slice(0, 1)}</Avatar>
        <Box>
          <Typography fontWeight={900}>{player.player.name}</Typography>
          <Typography color="text.secondary">
            {player.team.name} · {player.position.name}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip label={`${player.totalPoints} pts`} />
        <Chip label={`${player.ownershipPercent}% owned`} variant="outlined" />
        <Typography fontWeight={900}>{money(player.priceCents)}</Typography>
        <Button
          aria-label={`${selected ? 'Remove' : 'Select'} ${player.player.name}`}
          variant={selected ? 'outlined' : 'contained'}
          disabled={disabled || player.status !== 'available'}
          onClick={onToggle}
        >
          {selected ? 'Remove' : 'Select'}
        </Button>
      </Stack>
    </Stack>
  );
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}
function renumber(entries: FantasySquadEntry[]) {
  return entries.map((entry, index) => ({ ...entry, slotNumber: index + 1 }));
}
function money(cents: number) {
  return `₦${Math.round(cents / 100).toLocaleString()}`;
}
function deadlineLabel(value?: string) {
  if (!value) return 'Deadline pending';
  const date = new Date(value.replace(' ', 'T') + 'Z');
  return `Deadline ${date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
}
function isOffense(code?: string) {
  return ['QB', 'WR', 'RB', 'REC', 'RUSH', 'ALL', 'ATH', 'C'].includes((code ?? '').toUpperCase());
}
function shortName(name?: string) {
  if (!name) return 'Player';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}
