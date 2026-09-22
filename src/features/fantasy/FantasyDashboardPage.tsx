import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Portal,
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
import { useEffect, useMemo, useRef, useState } from 'react';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import privateLeaguesImage from '../../assets/fantasy-private-leagues-coming-soon.jpg';
import versusImage from '../../assets/fantasy-versus-coming-soon.jpg';
import winnerPoolImage from '../../assets/fantasy-winner-pool-coming-soon.jpg';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { AuthAccessDialog } from '../../components/AuthAccessDialog';
import type { FantasyPlayer, FantasySquadEntry } from '../../types/api';
import { FantasyBanter } from './FantasyBanter';

const fantasyGuideSteps = [
  {
    target: 'identity',
    eyebrow: 'Step 1 · Your team',
    title: 'Make it yours',
    body: 'Choose the competition, name your fantasy team and keep an eye on budget and the deadline.',
  },
  {
    target: 'pitch',
    eyebrow: 'Step 2 · Build',
    title: 'Tap a + on the pitch',
    body: 'Empty slots open a quick player search already filtered for offense or defense.',
  },
  {
    target: 'market',
    eyebrow: 'Step 3 · Scout',
    title: 'Search the full market',
    body: 'Compare price, points, ownership, position and team before adding a player.',
  },
  {
    target: 'captain',
    eyebrow: 'Step 4 · Lead',
    title: 'Set captain and vice-captain',
    body: 'Your captain scores double. The vice-captain takes over if the captain does not play.',
  },
  {
    target: 'performance',
    eyebrow: 'Step 5 · Track',
    title: 'Follow every gameweek',
    body: 'Weekly tables and saved squad history let you review the exact selection and performance later.',
  },
  {
    target: 'submit',
    eyebrow: 'Step 6 · Lock in',
    title: 'Save, review, submit',
    body: 'Drafts stay editable until the deadline. Submit only when the squad, formation and captaincy are ready.',
  },
] as const;

type GuideTargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

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
  const [teamName, setTeamName] = useState('');
  const [teamNameTouched, setTeamNameTouched] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [banterOpen, setBanterOpen] = useState(false);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [playerDetail, setPlayerDetail] = useState<FantasyPlayer | null>(null);
  const [leaderboardMode, setLeaderboardMode] = useState<'gameweek' | 'overall'>('gameweek');
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved: unknown = JSON.parse(
      window.localStorage.getItem('instascore-fantasy-watchlist') || '[]',
    );
    return new Set(
      Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string') : [],
    );
  });
  const [tableGameweek, setTableGameweek] = useState('');
  const [slotPicker, setSlotPicker] = useState<'offense' | 'defense' | null>(null);
  const [slotSearch, setSlotSearch] = useState('');
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [guideTargetRect, setGuideTargetRect] = useState<GuideTargetRect | null>(null);
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
  const history = useQuery({
    queryKey: ['fantasy', activeGameUuid, 'squad-history'],
    queryFn: () => api.getFantasySquadHistory(activeGameUuid),
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
  const marketPlayers = (players.data ?? [])
    .filter(
      (player) => !affordableOnly || selectedIds.has(player.uuid) || player.priceCents <= remaining,
    )
    .slice(0, visiblePlayers);
  const isComplete =
    squadEntries.length === game?.squadSize && starting.length === game.startingSize;
  const performanceWeeks = uniqueBy(performance.data ?? [], (row) => row.gameweekUuid);
  const activeTableGameweek = tableGameweek || performanceWeeks[0]?.gameweekUuid || '';
  const performanceRows = (performance.data ?? [])
    .filter((row) => row.gameweekUuid === activeTableGameweek)
    .sort((a, b) =>
      leaderboardMode === 'overall' ? b.totalPoints - a.totalPoints : a.rank - b.rank,
    );
  const hasCaptain = starting.some((entry) => entry.isCaptain);
  const hasViceCaptain = starting.some((entry) => entry.isViceCaptain);
  const readinessIssues = [
    ...(teamName.trim().length < 3 ? ['Name your fantasy team'] : []),
    ...(squadEntries.length < (game?.squadSize ?? 0)
      ? [
          `Pick ${Math.max(0, (game?.squadSize ?? 0) - squadEntries.length)} more player${(game?.squadSize ?? 0) - squadEntries.length === 1 ? '' : 's'}`,
        ]
      : []),
    ...(starting.length < (game?.startingSize ?? 0)
      ? [
          `Fill ${Math.max(0, (game?.startingSize ?? 0) - starting.length)} starting slot${(game?.startingSize ?? 0) - starting.length === 1 ? '' : 's'}`,
        ]
      : []),
    ...(!hasCaptain ? ['Choose a captain'] : []),
    ...(!hasViceCaptain ? ['Choose a vice-captain'] : []),
    ...(remaining < 0 ? ['Bring the squad under budget'] : []),
  ];
  useEffect(() => {
    if (squad.data?.squad?.name) setTeamName(squad.data.squad.name);
  }, [squad.data?.squad?.name]);
  useEffect(() => {
    if (!squad.data?.squad?.name && !teamNameTouched && state?.user?.displayName) {
      setTeamName(`${state.user.displayName} CFFL Team`);
    }
  }, [squad.data?.squad?.name, state?.user?.displayName, teamNameTouched]);
  useEffect(() => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem('instascore-fantasy-watchlist', JSON.stringify([...watchlist]));
  }, [watchlist]);
  useEffect(() => {
    if (!activeGameUuid || typeof window === 'undefined') return;
    if (!window.localStorage.getItem('instascore-fantasy-guide-v1')) setGuideStep(0);
  }, [activeGameUuid]);
  useEffect(() => {
    if (guideStep === null || typeof document === 'undefined') return;
    const guideItem = fantasyGuideSteps[guideStep];
    if (!guideItem) return;
    if (guideItem.target === 'market') setWorkspaceTab('players');
    if (['pitch', 'captain', 'submit'].includes(guideItem.target)) setWorkspaceTab('squad');

    let frame = 0;
    const findTarget = () =>
      document.querySelector<HTMLElement>(`[data-fantasy-guide="${guideItem.target}"]`);
    const updateTarget = () => {
      const rect = findTarget()?.getBoundingClientRect();
      setGuideTargetRect(
        rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
      );
    };
    const revealTarget = () => {
      const target = findTarget();
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(updateTarget);
      });
    };
    frame = window.requestAnimationFrame(revealTarget);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
      setGuideTargetRect(null);
    };
  }, [guideStep]);
  const save = useMutation({
    mutationFn: (submit: boolean) => {
      const payload = {
        name: teamName.trim(),
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
        <Stack
          spacing={3}
          className="fantasy-page-stack"
          onClickCapture={(event) => {
            if (state?.authenticated) return;
            const target = event.target as HTMLElement;
            if (
              !target.closest(
                'button, input, textarea, [role="button"], [role="tab"], [role="combobox"]',
              )
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            setAuthOpen(true);
          }}
        >
          {!state?.authenticated ? (
            <Alert severity="info">
              <strong>Sign in to play.</strong> Any fantasy action will open secure login or
              registration—your picks, team name and banter stay tied to your account.
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
                <Button size="small" variant="outlined" onClick={() => setGuideStep(0)}>
                  Show guide
                </Button>
              </Stack>
            </Stack>
          </Box>
          <FantasyPromotions />
          <Accordion className="instascore-panel fantasy-governance" disableGutters>
            <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}>
              <Box>
                <Typography variant="overline" color="primary.main" fontWeight={900}>
                  Market governance
                </Typography>
                <Typography variant="h4">How buying and selling players works</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="ol" className="fantasy-governance-list">
                <li>
                  <strong>One official market:</strong> prices and eligibility are set per season by
                  the competition administrator.
                </li>
                <li>
                  <strong>Budget and team caps:</strong> every purchase must remain within budget,
                  position quotas and the maximum players allowed from one real team.
                </li>
                <li>
                  <strong>Deadline lock:</strong> squads, captaincy and transfers lock at the
                  published gameweek deadline; no backdating is allowed.
                </li>
                <li>
                  <strong>Like-for-like transfers:</strong> the incoming player must match the
                  outgoing fantasy position and be available.
                </li>
                <li>
                  <strong>Transfer cost:</strong> the first completed transfer in a gameweek is
                  free; each additional transfer deducts four fantasy points.
                </li>
                <li>
                  <strong>Price integrity:</strong> the squad uses the season price list. Admin
                  opening prices lock after the first submitted squad.
                </li>
                <li>
                  <strong>Audit and recovery:</strong> every save, submission and transfer is
                  revisioned; each gameweek keeps its own immutable lineup and score record.
                </li>
                <li>
                  <strong>Challenge integrity:</strong> versus and winner-pool opponents use the
                  same gameweek, deadline, player pool and scoring version. Ties, cancelled games
                  and corrections follow published settlement rules.
                </li>
              </Box>
            </AccordionDetails>
          </Accordion>
          <Accordion className="instascore-panel fantasy-chat-control" disableGutters>
            <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}>
              <Box>
                <Typography variant="overline" color="primary.main" fontWeight={1000}>
                  Live room
                </Typography>
                <Typography variant="h4">Fantasy league banter</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                React to every gameweek with the managers in this league. Moderation, reporting and
                rate limits apply.
              </Typography>
              <Button variant="contained" fullWidth onClick={() => setBanterOpen(true)}>
                Open live banter
              </Button>
            </AccordionDetails>
          </Accordion>
          <Box className="instascore-panel fantasy-command-bar" data-fantasy-guide="identity">
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
                  onChange={(event) => {
                    setTeamNameTouched(true);
                    setTeamName(event.target.value);
                  }}
                  inputProps={{ maxLength: 80 }}
                  helperText={
                    teamName.trim().length < 3
                      ? 'A team name of at least 3 characters is required.'
                      : 'Saved with your squad'
                  }
                  error={state?.authenticated && teamName.trim().length < 3}
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

          <Box className={`fantasy-readiness-bar${readinessIssues.length ? '' : ' is-ready'}`}>
            <Stack direction="row" alignItems="center" gap={1} minWidth={0}>
              <span className="fantasy-readiness-dot" />
              <Box minWidth={0}>
                <Typography fontWeight={1000} noWrap>
                  {squad.data?.gameweek.name ?? 'Current gameweek'} ·{' '}
                  {readinessIssues.length
                    ? `${readinessIssues.length} action${readinessIssues.length === 1 ? '' : 's'} remaining`
                    : 'Ready to submit'}
                </Typography>
                <Typography variant="caption" noWrap>
                  {readinessIssues[0] ?? deadlineLabel(squad.data?.gameweek.deadlineAt)}
                </Typography>
              </Box>
            </Stack>
            <Button
              size="small"
              variant={readinessIssues.length ? 'outlined' : 'contained'}
              onClick={() => (readinessIssues.length ? setGuideStep(0) : setReviewOpen(true))}
            >
              {readinessIssues.length ? 'Fix now' : 'Review team'}
            </Button>
          </Box>

          <Box className="instascore-panel fantasy-performance-panel">
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              gap={2}
              data-fantasy-guide="performance"
            >
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
                <Stack direction="row" gap={1} alignItems="center">
                  <Tabs
                    value={leaderboardMode}
                    onChange={(_, value: 'gameweek' | 'overall') => setLeaderboardMode(value)}
                    className="fantasy-leaderboard-tabs"
                  >
                    <Tab value="gameweek" label="Gameweek" />
                    <Tab value="overall" label="Overall" />
                  </Tabs>
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
                </Stack>
              ) : null}
            </Stack>
            {performance.isLoading ? <LoadingState label="Loading weekly fantasy table" /> : null}
            {performance.isError ? (
              <ErrorState description="The weekly fantasy table could not be loaded." />
            ) : null}
            {performanceRows.length ? (
              <>
                <Box className="fantasy-podium">
                  {performanceRows.slice(0, 3).map((row, index) => (
                    <Box
                      key={`podium-${row.teamName}`}
                      className={`fantasy-podium-place place-${index + 1}`}
                    >
                      <Avatar>{row.managerName.slice(0, 1)}</Avatar>
                      <strong>
                        #{index + 1} {row.teamName}
                      </strong>
                      <small>
                        {leaderboardMode === 'overall' ? row.totalPoints : row.gameweekPoints} pts
                      </small>
                    </Box>
                  ))}
                </Box>
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
                      {performanceRows.map((row, index) => (
                        <TableRow
                          key={`${row.gameweekUuid}-${row.rank}-${row.teamName}`}
                          className={
                            row.managerName === state?.user?.displayName ? 'is-current-manager' : ''
                          }
                        >
                          <TableCell>
                            #{leaderboardMode === 'overall' ? index + 1 : row.rank}{' '}
                            <RankMovement rank={row.rank} previousRank={row.previousRank} />
                          </TableCell>
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
              </>
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
                data-fantasy-guide="captain"
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
                onAddSlot={setSlotPicker}
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
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mt: 1.5 }}
                data-fantasy-guide="submit"
              >
                <Button
                  variant="contained"
                  disabled={
                    !state?.authenticated ||
                    save.isPending ||
                    remaining < 0 ||
                    squad.data?.gameweek.locked ||
                    teamName.trim().length < 3
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
                    squad.data?.gameweek.locked ||
                    teamName.trim().length < 3
                  }
                  onClick={() => setReviewOpen(true)}
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

            <Accordion
              className="instascore-panel fantasy-market-panel"
              defaultExpanded
              disableGutters
              sx={{ display: { xs: workspaceTab === 'players' ? 'block' : 'none', md: 'block' } }}
            >
              <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                  width="100%"
                >
                  <Box>
                    <Typography variant="h4">Player market</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {players.data?.length ?? 0} players · {squadEntries.length} selected
                    </Typography>
                  </Box>
                  {(search || position || team) && (
                    <Button
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSearch('');
                        setPosition('');
                        setTeam('');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Box
                  className="fantasy-market-filters"
                  sx={{ my: 1.5 }}
                  data-fantasy-guide="market"
                >
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
                      watched={watchlist.has(player.uuid)}
                      onWatch={() =>
                        setWatchlist((current) => {
                          const next = new Set(current);
                          if (next.has(player.uuid)) next.delete(player.uuid);
                          else next.add(player.uuid);
                          return next;
                        })
                      }
                      onInspect={() => setPlayerDetail(player)}
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
              </AccordionDetails>
            </Accordion>
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

          {state?.authenticated ? (
            <Box className="instascore-panel fantasy-history-panel">
              <Typography variant="overline" color="primary.main" fontWeight={900}>
                Saved every gameweek
              </Typography>
              <Typography variant="h3">My squad history</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Revisit the exact team you submitted and see how it performed after points are
                confirmed.
              </Typography>
              {history.isLoading ? <LoadingState label="Loading squad history" /> : null}
              {history.isError ? (
                <ErrorState description="Your saved gameweek squads could not be loaded." />
              ) : null}
              {(history.data?.length ?? 0) > 1 ? (
                <Box className="fantasy-form-chart" aria-label="Gameweek points trend">
                  {(history.data ?? []).map((week) => (
                    <Box key={`chart-${week.gameweekUuid}`}>
                      <span
                        style={{ height: `${Math.max(8, Math.min(100, week.gameweekPoints))}%` }}
                      />
                      <small>{week.gameweekName}</small>
                      <strong>{week.gameweekPoints}</strong>
                    </Box>
                  ))}
                </Box>
              ) : null}
              <Box className="fantasy-history-grid">
                {(history.data ?? []).map((week) => (
                  <Accordion key={week.gameweekUuid} disableGutters>
                    <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={2}
                        width="100%"
                      >
                        <Box>
                          <Typography fontWeight={900}>{week.gameweekName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {week.teamName} · {week.players.length} players
                          </Typography>
                        </Box>
                        <Stack direction="row" gap={1} alignItems="center">
                          <Chip
                            size="small"
                            label={`${week.gameweekPoints} pts`}
                            color={week.pointsStatus === 'confirmed' ? 'success' : 'default'}
                          />
                          {week.rank ? (
                            <Chip size="small" variant="outlined" label={`#${week.rank}`} />
                          ) : null}
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {week.players.map((entry) => (
                          <Chip
                            key={entry.fantasyPlayerUuid}
                            avatar={
                              <Avatar src={entry.player?.photoUrl ?? undefined}>
                                {entry.player?.name?.[0]}
                              </Avatar>
                            }
                            label={`${entry.player?.name ?? 'Player'}${entry.isCaptain ? ' (C)' : entry.isViceCaptain ? ' (V)' : ''}`}
                            variant={entry.slotType === 'bench' ? 'outlined' : 'filled'}
                          />
                        ))}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Season total: {week.seasonPoints} ·{' '}
                        {week.pointsStatus === 'confirmed' ? 'Final' : 'Provisional'}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
              {!history.isLoading && history.data?.length === 0 ? (
                <EmptyState
                  title="No saved gameweeks yet"
                  description="Save or submit your first squad to start your weekly history."
                />
              ) : null}
            </Box>
          ) : null}

          <Dialog
            open={Boolean(slotPicker)}
            onClose={() => setSlotPicker(null)}
            fullWidth
            maxWidth="sm"
            aria-labelledby="fantasy-slot-picker-title"
          >
            <DialogTitle id="fantasy-slot-picker-title">
              Add an {slotPicker === 'offense' ? 'offensive' : 'defensive'} player
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                fullWidth
                label="Search player or team"
                value={slotSearch}
                onChange={(event) => setSlotSearch(event.target.value)}
                sx={{ my: 1 }}
              />
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {(players.data ?? [])
                  .filter((player) => !selectedIds.has(player.uuid))
                  .filter(
                    (player) =>
                      slotPicker === (isOffense(player.position.code) ? 'offense' : 'defense'),
                  )
                  .filter((player) =>
                    `${player.player.name} ${player.team.name}`
                      .toLowerCase()
                      .includes(slotSearch.trim().toLowerCase()),
                  )
                  .slice(0, 12)
                  .map((player) => (
                    <PlayerRow
                      key={player.uuid}
                      player={player}
                      selected={false}
                      disabled={Boolean(selectionBlockReason(player))}
                      disabledReason={selectionBlockReason(player)}
                      onToggle={() => addPlayerFromPitch(player)}
                    />
                  ))}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSlotPicker(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  setSlotPicker(null);
                  setWorkspaceTab('players');
                }}
              >
                Open full market
              </Button>
            </DialogActions>
          </Dialog>

          {guideStep !== null ? (
            <FantasyGuide
              step={guideStep}
              targetRect={guideTargetRect}
              onBack={() => setGuideStep((current) => Math.max(0, (current ?? 0) - 1))}
              onNext={() => {
                if (guideStep === 0 && (!state?.authenticated || teamName.trim().length < 3)) {
                  if (!state?.authenticated) setAuthOpen(true);
                  return;
                }
                if (guideStep >= fantasyGuideSteps.length - 1) {
                  window.localStorage.setItem('instascore-fantasy-guide-v1', 'complete');
                  setGuideStep(null);
                  return;
                }
                setGuideStep(guideStep + 1);
              }}
              blocked={guideStep === 0 && (!state?.authenticated || teamName.trim().length < 3)}
              onSkip={() => {
                window.localStorage.setItem('instascore-fantasy-guide-v1', 'skipped');
                setGuideStep(null);
              }}
            />
          ) : null}

          <Box className="fantasy-mobile-actionbar">
            <Button variant="text" onClick={() => setWorkspaceTab('squad')}>
              View squad · {squadEntries.length}/{game.squadSize}
            </Button>
            <Button
              variant="contained"
              disabled={!state?.authenticated || save.isPending || !isComplete || remaining < 0}
              onClick={() => setReviewOpen(true)}
            >
              Submit team
            </Button>
          </Box>
          <Box className="fantasy-mobile-heads">
            <Button
              aria-label="Open fantasy market governance"
              onClick={() => setGovernanceOpen(true)}
            >
              §
            </Button>
            <Button aria-label="Open league banter" onClick={() => setBanterOpen(true)}>
              💬
            </Button>
          </Box>
          <Dialog
            open={governanceOpen}
            onClose={() => setGovernanceOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle sx={{ fontWeight: 1000 }}>Market governance</DialogTitle>
            <DialogContent>
              <FantasyGovernanceList />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setGovernanceOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
          <AuthAccessDialog open={authOpen} onClose={() => setAuthOpen(false)} />
          <FantasyBanter
            gameUuid={activeGameUuid}
            open={banterOpen}
            onClose={() => setBanterOpen(false)}
          />
          <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 1000 }}>Review your gameweek team</DialogTitle>
            <DialogContent>
              <Stack spacing={1.25}>
                <ReviewCheck
                  ready={teamName.trim().length >= 3}
                  label="Team identity"
                  value={teamName || 'Missing team name'}
                />
                <ReviewCheck
                  ready={isComplete}
                  label="Squad and formation"
                  value={`${starting.length}/${game.startingSize} starters · ${bench.length}/${game.benchSize} bench`}
                />
                <ReviewCheck
                  ready={remaining >= 0}
                  label="Budget"
                  value={`${money(Math.max(0, remaining))} remaining`}
                />
                <ReviewCheck
                  ready={hasCaptain && hasViceCaptain}
                  label="Leadership"
                  value={`${starting.find((entry) => entry.isCaptain)?.player?.name ?? 'Captain missing'} · ${starting.find((entry) => entry.isViceCaptain)?.player?.name ?? 'Vice-captain missing'}`}
                />
                <ReviewCheck
                  ready={!squad.data?.gameweek.locked}
                  label="Deadline"
                  value={deadlineLabel(squad.data?.gameweek.deadlineAt)}
                />
                {readinessIssues.length ? (
                  <Alert severity="warning">
                    Resolve {readinessIssues.length} item{readinessIssues.length === 1 ? '' : 's'}{' '}
                    before submission.
                  </Alert>
                ) : (
                  <Alert severity="success">Your squad passes every submission check.</Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReviewOpen(false)}>Keep editing</Button>
              <Button
                variant="contained"
                disabled={readinessIssues.length > 0 || save.isPending}
                onClick={() => {
                  setReviewOpen(false);
                  save.mutate(true);
                }}
              >
                Confirm team
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={Boolean(playerDetail)}
            onClose={() => setPlayerDetail(null)}
            fullWidth
            maxWidth="xs"
          >
            {playerDetail ? (
              <>
                <DialogTitle sx={{ fontWeight: 1000 }}>{playerDetail.player.name}</DialogTitle>
                <DialogContent>
                  <Stack alignItems="center" spacing={1.5}>
                    <Avatar
                      src={playerDetail.player.photoUrl ?? undefined}
                      sx={{ width: 84, height: 84 }}
                    >
                      {playerDetail.player.name[0]}
                    </Avatar>
                    <Typography color="text.secondary">
                      {playerDetail.team.name} · {playerDetail.position.name}
                    </Typography>
                    <Box className="fantasy-player-metrics">
                      <span>
                        <strong>{playerDetail.totalPoints}</strong>Points
                      </span>
                      <span>
                        <strong>{playerDetail.ownershipPercent}%</strong>Owned
                      </span>
                      <span>
                        <strong>{money(playerDetail.priceCents)}</strong>Price
                      </span>
                    </Box>
                    <Chip
                      color={playerDetail.status === 'available' ? 'success' : 'warning'}
                      label={playerDetail.status}
                    />
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() =>
                      setWatchlist((current) => {
                        const next = new Set(current);
                        if (next.has(playerDetail.uuid)) next.delete(playerDetail.uuid);
                        else next.add(playerDetail.uuid);
                        return next;
                      })
                    }
                  >
                    {watchlist.has(playerDetail.uuid) ? 'Remove watchlist' : 'Add to watchlist'}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={Boolean(selectionBlockReason(playerDetail))}
                    onClick={() => {
                      togglePlayer(playerDetail);
                      setPlayerDetail(null);
                    }}
                  >
                    {selectedIds.has(playerDetail.uuid) ? 'Remove' : 'Add player'}
                  </Button>
                </DialogActions>
              </>
            ) : null}
          </Dialog>
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
  function addPlayerFromPitch(player: FantasyPlayer) {
    if (selectionBlockReason(player) || starting.length >= game!.startingSize) return;
    setDraft([
      ...squadEntries,
      {
        fantasyPlayerUuid: player.uuid,
        slotType: 'starting',
        slotNumber: starting.length + 1,
        isCaptain: starting.length === 0,
        isViceCaptain: starting.length === 1,
        priceCents: player.priceCents,
        position: player.position,
        player: player.player,
        team: player.team,
      },
    ]);
    setSelectionMessage(`${player.player.name} added to your starting lineup.`);
    setSlotPicker(null);
    setSlotSearch('');
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
  onAddSlot,
}: {
  entries: FantasySquadEntry[];
  expectedSize: number;
  selectedUuid: string;
  onSelect: (uuid: string) => void;
  onCaptain: (uuid: string, role: 'captain' | 'vice') => void;
  onAddSlot: (unit: 'offense' | 'defense') => void;
}) {
  const offense = entries.filter((entry) => isOffense(entry.position?.code));
  const defense = entries.filter((entry) => !isOffense(entry.position?.code));
  const offenseTarget = Math.ceil(expectedSize / 2);
  const defenseTarget = Math.floor(expectedSize / 2);
  const defenseOpenSlots = Math.max(0, defenseTarget - defense.length);
  const offenseOpenSlots = Math.max(0, offenseTarget - offense.length);

  return (
    <Box
      className="fantasy-pitch"
      sx={{ mt: 3 }}
      data-fantasy-guide={defenseOpenSlots + offenseOpenSlots === 0 ? 'pitch' : undefined}
    >
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
        {Array.from({ length: defenseOpenSlots }, (_, index) => (
          <PitchSlot
            key={`defense-${index}`}
            index={defense.length + index}
            count={defenseTarget}
            unit="defense"
            guideTarget={index === 0}
            onAdd={onAddSlot}
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
        {Array.from({ length: offenseOpenSlots }, (_, index) => (
          <PitchSlot
            key={`offense-${index}`}
            index={offense.length + index}
            count={offenseTarget}
            unit="offense"
            guideTarget={defenseOpenSlots === 0 && index === 0}
            onAdd={onAddSlot}
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

function PitchSlot({
  index,
  count,
  unit,
  guideTarget,
  onAdd,
}: {
  index: number;
  count: number;
  unit: 'offense' | 'defense';
  guideTarget: boolean;
  onAdd: (unit: 'offense' | 'defense') => void;
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
      className="fantasy-pitch-slot"
      sx={{ left: `${left}%`, top: `${top}%` }}
      aria-label={`Add ${unit} player`}
      data-fantasy-guide={guideTarget ? 'pitch' : undefined}
      onClick={() => onAdd(unit)}
    >
      <span>+</span>
      <small>Empty</small>
    </Box>
  );
}

function FantasyModeBanner({
  label,
  title,
  description,
  status,
  image,
}: {
  label: string;
  title: string;
  description: string;
  status: string;
  image: string;
}) {
  return (
    <Box className="fantasy-mode-banner" sx={{ '--fantasy-promo-image': `url(${image})` }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="overline" fontWeight={1000}>
          {label}
        </Typography>
        <Chip size="small" label={status} />
      </Stack>
      <Typography variant="h4">{title}</Typography>
      <Typography variant="body2">{description}</Typography>
    </Box>
  );
}

const fantasyPromotions = [
  {
    label: 'Private leagues',
    title: 'Coming soon: compete with your circle',
    description:
      'Invite-only tables will use the same official squad, deadlines and scoring—without rebuilding your team.',
    image: privateLeaguesImage,
  },
  {
    label: 'Versus',
    title: 'Coming soon: one manager, one rival',
    description:
      'Weekly head-to-head records will use identical rules, automatic points and transparent tie-breakers.',
    image: versusImage,
  },
  {
    label: 'Winner pool',
    title: 'Coming soon: governed winner challenges',
    description:
      'This planned mode remains subject to age, identity, location, responsible-play and settlement controls.',
    image: winnerPoolImage,
  },
] as const;

function FantasyPromotions() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const updateActiveSlide = () => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const closest = cards.reduce(
      (best, card, index) => {
        const distance = Math.abs(card.offsetLeft - track.scrollLeft);
        return distance < best.distance ? { index, distance } : best;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    );
    setActiveSlide(closest.index);
  };

  const goToSlide = (index: number) => {
    const card = trackRef.current?.children[index] as HTMLElement | undefined;
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
    setActiveSlide(index);
  };

  return (
    <Box className="fantasy-promotions" aria-label="Fantasy modes coming soon">
      <Box ref={trackRef} className="fantasy-mode-banners" onScroll={updateActiveSlide}>
        {fantasyPromotions.map((promotion) => (
          <FantasyModeBanner key={promotion.label} {...promotion} status="Coming soon" />
        ))}
      </Box>
      <Box className="fantasy-promo-pagination" aria-label="Choose a coming-soon feature">
        {fantasyPromotions.map((promotion, index) => (
          <Box
            component="button"
            type="button"
            key={promotion.label}
            className={index === activeSlide ? 'is-active' : ''}
            aria-label={`Show ${promotion.label}`}
            aria-current={index === activeSlide ? 'true' : undefined}
            onClick={() => goToSlide(index)}
          />
        ))}
      </Box>
    </Box>
  );
}

function FantasyGuide({
  step,
  targetRect,
  onBack,
  onNext,
  onSkip,
  blocked,
}: {
  step: number;
  targetRect: GuideTargetRect | null;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  blocked: boolean;
}) {
  const item = fantasyGuideSteps[step];
  if (!item) return null;
  const finalStep = step === fantasyGuideSteps.length - 1;
  const targetIsLow = targetRect
    ? targetRect.top + targetRect.height / 2 > window.innerHeight / 2
    : false;
  return (
    <Portal>
      <Box
        className={`fantasy-guide${targetIsLow ? ' fantasy-guide--target-low' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fantasy-guide-title"
      >
        {targetRect ? (
          <Box
            className="fantasy-guide-focus"
            aria-hidden="true"
            sx={{
              top: Math.max(8, targetRect.top - 8),
              left: Math.max(8, targetRect.left - 8),
              width: Math.min(window.innerWidth - 16, targetRect.width + 16),
              height: Math.min(window.innerHeight - 16, targetRect.height + 16),
            }}
          />
        ) : (
          <Box className="fantasy-guide-backdrop" aria-hidden="true" />
        )}
        <Box className="fantasy-guide-card">
          <Box className="fantasy-guide-motion" aria-hidden="true">
            <span>+</span>
            <i />
          </Box>
          <Typography variant="overline" color="primary.main" fontWeight={1000}>
            {item.eyebrow}
          </Typography>
          <Typography id="fantasy-guide-title" variant="h3">
            {item.title}
          </Typography>
          <Typography color="text.secondary">{item.body}</Typography>
          <Box
            className="fantasy-guide-progress"
            aria-label={`Guide step ${step + 1} of ${fantasyGuideSteps.length}`}
          >
            {fantasyGuideSteps.map((guideItem, index) => (
              <span
                key={guideItem.target}
                className={index === step ? 'is-active' : index < step ? 'is-done' : ''}
              />
            ))}
          </Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Button size="small" color="inherit" onClick={onSkip}>
              Skip guide
            </Button>
            <Stack direction="row" gap={1}>
              {step > 0 ? (
                <Button size="small" onClick={onBack}>
                  Back
                </Button>
              ) : null}
              <Button variant="contained" size="small" onClick={onNext}>
                {blocked ? 'Name your team first' : finalStep ? 'Start playing' : 'Next'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Portal>
  );
}

function FantasyGovernanceList() {
  return (
    <Box component="ol" className="fantasy-governance-list">
      <li>
        <strong>Season market:</strong> prices and eligibility are controlled by the league
        administrator.
      </li>
      <li>
        <strong>Fair squads:</strong> budget, position and real-team caps apply to everyone.
      </li>
      <li>
        <strong>Deadline lock:</strong> picks, transfers and captaincy lock at the published
        deadline.
      </li>
      <li>
        <strong>Transfer cost:</strong> one free completed transfer per week; extras cost four
        points.
      </li>
      <li>
        <strong>Immutable history:</strong> every gameweek preserves the submitted lineup and score.
      </li>
      <li>
        <strong>Respect the room:</strong> abuse, threats, spam and identity attacks can trigger
        moderation or bans.
      </li>
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
  watched = false,
  onWatch,
  onInspect,
}: {
  player: FantasyPlayer;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
  onToggle: () => void;
  watched?: boolean;
  onWatch?: () => void;
  onInspect?: () => void;
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
        <Typography
          fontWeight={900}
          noWrap
          fontSize=".88rem"
          component={onInspect ? 'button' : 'span'}
          onClick={onInspect}
          className={onInspect ? 'fantasy-player-name-button' : undefined}
        >
          {player.player.name}
        </Typography>
        <Typography color="text.secondary" variant="caption" noWrap display="block">
          {player.team.name} · {player.totalPoints} pts · {player.ownershipPercent}%
        </Typography>
      </Box>
      {onWatch ? (
        <Button
          className="fantasy-watch-button"
          size="small"
          aria-label={`${watched ? 'Remove' : 'Add'} ${player.player.name} ${watched ? 'from' : 'to'} watchlist`}
          onClick={onWatch}
        >
          {watched ? '★' : '☆'}
        </Button>
      ) : null}
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

function RankMovement({ rank, previousRank }: { rank: number; previousRank: number | null }) {
  if (!previousRank || previousRank === rank)
    return (
      <Typography component="span" variant="caption" color="text.secondary">
        —
      </Typography>
    );
  const up = previousRank > rank;
  return (
    <Typography
      component="span"
      variant="caption"
      color={up ? 'success.main' : 'error.main'}
      fontWeight={900}
    >
      {up ? '↑' : '↓'}
      {Math.abs(previousRank - rank)}
    </Typography>
  );
}

function ReviewCheck({ ready, label, value }: { ready: boolean; label: string; value: string }) {
  return (
    <Stack
      direction="row"
      gap={1.25}
      alignItems="center"
      className={`fantasy-review-check${ready ? ' is-ready' : ''}`}
    >
      <span>{ready ? '✓' : '!'}</span>
      <Box>
        <Typography fontWeight={900}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {value}
        </Typography>
      </Box>
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
