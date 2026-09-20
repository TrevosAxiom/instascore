import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

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
  const [visiblePlayers, setVisiblePlayers] = useState(24);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'squad' | 'players' | 'bench'>('squad');
  const [selectionMessage, setSelectionMessage] = useState('');
  const [teamName, setTeamName] = useState('My InstaScore Squad');
  const [tableGameweek, setTableGameweek] = useState('');
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
  const performance = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'performance-table'],
    queryFn: () => api.getFantasyPerformanceTable(activeGameUuid),
    enabled: Boolean(activeGameUuid),
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
  const marketPlayers = (players.data ?? [])
    .filter(
      (player) => !affordableOnly || selectedIds.has(player.uuid) || player.priceCents <= remaining,
    )
    .slice(0, visiblePlayers);
  const isComplete =
    squadEntries.length === game?.squadSize && starting.length === game.startingSize;
  const performanceWeeks = uniqueBy(performance.data ?? [], (row) => row.gameweekUuid);
  const activeTableGameweek = tableGameweek || performanceWeeks[0]?.gameweekUuid || '';
  const performanceRows = (performance.data ?? []).filter(
    (row) => row.gameweekUuid === activeTableGameweek,
  );
  useEffect(() => {
    if (squad.data?.squad?.name) setTeamName(squad.data.squad.name);
  }, [squad.data?.squad?.name]);
  const save = useMutation({
    mutationFn: (submit: boolean) => {
      const payload = {
        name: teamName.trim() || 'My InstaScore Squad',
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
            <Alert severity="info">
              You can browse the player market, build a temporary squad and view the weekly table.
              Sign in only when you are ready to save or submit your team.
            </Alert>
          ) : null}
          <Box className="instascore-panel fantasy-official-league">
            <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" color="primary.main" fontWeight={900}>
                  Official competition
                </Typography>
                <Typography variant="h3">Everyone plays in one league</Typography>
                <Typography color="text.secondary">
                  Build one squad for {game.name}. Your live points automatically place you on the
                  overall leaderboard—there are no private leagues or invite codes.
                </Typography>
              </Box>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip label="1. Pick squad" color={!isComplete ? 'primary' : 'default'} />
                <Chip label="2. Set captain" color={isComplete ? 'primary' : 'default'} />
                <Chip label="3. Review" />
                <Chip label="4. Submit" />
              </Stack>
            </Stack>
          </Box>
          <Box className="instascore-panel fantasy-command-bar">
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ flex: 1 }}>
                <TextField
                  select
                  label="Fantasy competition"
                  value={activeGameUuid}
                  onChange={(event) => {
                    setSelectedGameUuid(event.target.value);
                    setDraft(null);
                  }}
                  sx={{ minWidth: 240 }}
                >
                  {(games.data ?? []).map((item) => (
                    <MenuItem key={item.uuid} value={item.uuid}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Fantasy team name"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  inputProps={{ maxLength: 80 }}
                  helperText={
                    state?.authenticated ? 'Saved with your squad' : 'Sign in to save this name'
                  }
                  fullWidth
                />
              </Stack>
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

          <Box className="instascore-panel fantasy-performance-panel">
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="overline" color="primary.main" fontWeight={900}>
                  Official standings
                </Typography>
                <Typography variant="h3">Weekly performance table</Typography>
                <Typography color="text.secondary">
                  Compare each fantasy team’s gameweek score and season total.
                </Typography>
              </Box>
              {performanceWeeks.length ? (
                <TextField
                  select
                  label="Gameweek"
                  value={activeTableGameweek}
                  onChange={(event) => setTableGameweek(event.target.value)}
                  sx={{ minWidth: 190 }}
                >
                  {performanceWeeks.map((week) => (
                    <MenuItem key={week.gameweekUuid} value={week.gameweekUuid}>
                      {week.gameweekName}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
            </Stack>
            {performance.isLoading ? <LoadingState label="Loading weekly fantasy table" /> : null}
            {performance.isError ? (
              <ErrorState description="The weekly fantasy table could not be loaded." />
            ) : null}
            {performanceRows.length ? (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small" aria-label="Weekly fantasy performance table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Fantasy team</TableCell>
                      <TableCell>Manager</TableCell>
                      <TableCell align="right">GW points</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performanceRows.map((row) => (
                      <TableRow key={`${row.gameweekUuid}-${row.rank}-${row.teamName}`}>
                        <TableCell>#{row.rank}</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>{row.teamName}</TableCell>
                        <TableCell>{row.managerName}</TableCell>
                        <TableCell align="right">{row.gameweekPoints}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900 }}>
                          {row.totalPoints}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : !performance.isLoading && !performance.isError ? (
              <EmptyState
                title="No weekly scores yet"
                description="Submitted teams will appear after the first fantasy points are calculated."
              />
            ) : null}
          </Box>

          <Tabs
            className="fantasy-mobile-tabs"
            value={workspaceTab}
            onChange={(_, value: 'squad' | 'players' | 'bench') => setWorkspaceTab(value)}
            variant="fullWidth"
            aria-label="Fantasy team workspace"
          >
            <Tab value="squad" label={`Squad ${starting.length}/${game.startingSize}`} />
            <Tab value="players" label="Players" />
            <Tab value="bench" label={`Bench ${bench.length}/${game.benchSize}`} />
          </Tabs>

          {selectionMessage ? <Alert severity="success">{selectionMessage}</Alert> : null}

          <Box className="fantasy-builder-grid">
            <Box
              className="instascore-panel fantasy-squad-shell"
              sx={{
                display: { xs: workspaceTab === 'squad' ? 'block' : 'none', md: 'block' },
                background: 'linear-gradient(145deg, rgb(7, 25, 45), rgb(12, 39, 67))',
                color: 'white',
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                gap={1}
                alignItems={{ md: 'center' }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: 'rgba(255,255,255,.6)', fontWeight: 900, letterSpacing: '.18em' }}
                  >
                    Fantasy · {squad.data?.gameweek.name ?? 'Current gameweek'}
                  </Typography>
                  <Typography variant="h4" color="inherit">
                    My starting lineup
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
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
                expectedSize={game.startingSize}
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
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

            <Box
              className="instascore-panel fantasy-market-panel"
              sx={{ display: { xs: workspaceTab === 'players' ? 'block' : 'none', md: 'block' } }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Box>
                  <Typography variant="h4">Player market</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {players.data?.length ?? 0} players · {squadEntries.length} selected
                  </Typography>
                </Box>
                {(search || position || team) && (
                  <Button
                    size="small"
                    onClick={() => {
                      setSearch('');
                      setPosition('');
                      setTeam('');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
              <Box className="fantasy-market-filters" sx={{ my: 1.5 }}>
                <TextField
                  className="fantasy-market-search"
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
                <FormControlLabel
                  className="fantasy-affordable-toggle"
                  control={
                    <Switch
                      checked={affordableOnly}
                      onChange={(event) => setAffordableOnly(event.target.checked)}
                    />
                  }
                  label="Affordable only"
                />
              </Box>
              {players.isLoading ? <LoadingState label="Loading player market" /> : null}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 0.75,
                }}
              >
                {marketPlayers.map((player) => (
                  <PlayerRow
                    key={player.uuid}
                    player={player}
                    selected={selectedIds.has(player.uuid)}
                    disabled={
                      !selectedIds.has(player.uuid) && squadEntries.length >= game.squadSize
                    }
                    disabledReason={selectionBlockReason(player)}
                    onToggle={() => togglePlayer(player)}
                  />
                ))}
              </Box>
              {(players.data?.length ?? 0) > visiblePlayers ? (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setVisiblePlayers((count) => count + 24)}
                  >
                    Show more players
                  </Button>
                </Box>
              ) : null}
              {!players.isLoading && players.data?.length === 0 ? (
                <EmptyState
                  title="No players match these filters"
                  description="Clear a filter or search another name."
                />
              ) : null}
            </Box>
            <Box
              className="instascore-panel fantasy-mobile-bench"
              sx={{ display: { xs: workspaceTab === 'bench' ? 'block' : 'none', md: 'none' } }}
            >
              <Typography variant="h3">Your bench</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {Math.max(0, game.benchSize - bench.length)} bench places still available.
              </Typography>
              <FormationGrid
                entries={bench}
                onRole={changeRole}
                onCaptain={setCaptain}
                onRemove={removePlayer}
              />
              {!bench.length ? (
                <EmptyState
                  title="No substitutes yet"
                  description="Add players after filling the starting lineup."
                />
              ) : null}
            </Box>
          </Box>

          <Box className="fantasy-mobile-actionbar">
            <Button variant="text" onClick={() => setWorkspaceTab('squad')}>
              View squad · {squadEntries.length}/{game.squadSize}
            </Button>
            <Button
              variant="contained"
              disabled={!state?.authenticated || save.isPending || !isComplete || remaining < 0}
              onClick={() => save.mutate(true)}
            >
              Submit team
            </Button>
          </Box>
        </Stack>
      ) : null}
    </PageScaffold>
  );

  function togglePlayer(player: FantasyPlayer) {
    if (selectedIds.has(player.uuid)) {
      removePlayer(player.uuid);
      setSelectionMessage(`${player.player.name} removed from your squad.`);
      return;
    }
    if (squadEntries.length >= game!.squadSize) return;
    if (player.priceCents > remaining) return;
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
    setSelectionMessage(
      `${player.player.name} added to your ${starter ? 'starting lineup' : 'bench'}.`,
    );
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
  function selectionBlockReason(player: FantasyPlayer) {
    if (selectedIds.has(player.uuid)) return '';
    if (player.status !== 'available') return 'Player unavailable';
    if (squadEntries.length >= game!.squadSize) return 'Squad is full';
    if (player.priceCents > remaining) return 'Insufficient budget';
    return '';
  }
}

function FantasyPitch({
  entries,
  expectedSize,
  selectedUuid,
  onSelect,
  onCaptain,
}: {
  entries: FantasySquadEntry[];
  expectedSize: number;
  selectedUuid: string;
  onSelect: (uuid: string) => void;
  onCaptain: (uuid: string, role: 'captain' | 'vice') => void;
}) {
  const offense = entries.filter((entry) => isOffense(entry.position?.code));
  const defense = entries.filter((entry) => !isOffense(entry.position?.code));
  const offenseTarget = Math.ceil(expectedSize / 2);
  const defenseTarget = Math.floor(expectedSize / 2);

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
            count={defenseTarget}
            selected={selectedUuid === entry.fantasyPlayerUuid}
            onSelect={onSelect}
            onCaptain={onCaptain}
          />
        ))}
        {Array.from({ length: Math.max(0, defenseTarget - defense.length) }, (_, index) => (
          <PitchSlot
            key={`defense-${index}`}
            index={defense.length + index}
            count={defenseTarget}
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
            count={offenseTarget}
            selected={selectedUuid === entry.fantasyPlayerUuid}
            onSelect={onSelect}
            onCaptain={onCaptain}
          />
        ))}
        {Array.from({ length: Math.max(0, offenseTarget - offense.length) }, (_, index) => (
          <PitchSlot
            key={`offense-${index}`}
            index={offense.length + index}
            count={offenseTarget}
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

function PitchSlot({ index, count }: { index: number; count: number }) {
  const columns = Math.min(Math.max(count, 1), 4);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const itemsInRow = Math.min(columns, count - row * columns);
  const left = ((column + 1) / (itemsInRow + 1)) * 100;
  const top = count <= 4 ? 50 : row === 0 ? 30 : 70;
  return (
    <Box
      className="fantasy-pitch-slot"
      sx={{ left: `${left}%`, top: `${top}%` }}
      aria-hidden="true"
    >
      <span>+</span>
      <small>Empty</small>
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
  disabledReason,
  onToggle,
}: {
  player: FantasyPlayer;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
  onToggle: () => void;
}) {
  return (
    <Stack
      className="fantasy-player-row"
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        p: 1,
        minWidth: 0,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 2,
        backgroundColor: selected ? 'action.selected' : 'background.paper',
      }}
    >
      <Avatar src={player.player.photoUrl ?? undefined} sx={{ width: 38, height: 38 }}>
        {player.player.name.slice(0, 1)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography fontWeight={900} noWrap fontSize=".88rem">
          {player.player.name}
        </Typography>
        <Typography color="text.secondary" variant="caption" noWrap display="block">
          {player.team.name} · {player.totalPoints} pts · {player.ownershipPercent}%
        </Typography>
      </Box>
      <Chip label={player.position.code} size="small" color="primary" variant="outlined" />
      <Typography fontWeight={950} fontSize=".88rem" sx={{ minWidth: 46, textAlign: 'right' }}>
        {money(player.priceCents)}
      </Typography>
      <Button
        aria-label={`${selected ? 'Remove' : 'Select'} ${player.player.name}`}
        variant={selected ? 'outlined' : 'contained'}
        color={selected ? 'error' : 'primary'}
        size="small"
        disabled={disabled || Boolean(disabledReason)}
        onClick={onToggle}
        title={disabledReason || undefined}
        sx={{ minWidth: 70 }}
      >
        {selected ? 'Remove' : compactBlockReason(disabledReason)}
      </Button>
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
function compactBlockReason(reason: string) {
  if (!reason) return 'Add';
  if (reason.includes('budget')) return 'Budget';
  if (reason.includes('full')) return 'Full';
  return 'Unavailable';
}
