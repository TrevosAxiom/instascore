import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

const initialForm = {
  competitionUuid: '',
  seasonUuid: '',
  name: '',
  description: '',
  status: 'open' as 'draft' | 'open' | 'active',
  deadlineAt: '',
  gameweekName: 'Gameweek 1',
  budgetCents: 100_000,
  squadSize: 10,
  startingSize: 7,
  benchSize: 3,
  maxPlayersPerTeam: 3,
};

export function AdminFantasyPage() {
  const api = useApi();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState('');
  const [form, setForm] = useState(initialForm);
  const [selectedGameUuid, setSelectedGameUuid] = useState('');
  const [reason, setReason] = useState('Verified against official match events.');
  const [ruleEvent, setRuleEvent] = useState('touchdown');
  const [rulePoints, setRulePoints] = useState(6);
  const [gameweekName, setGameweekName] = useState('');
  const [gameweekDeadline, setGameweekDeadline] = useState('');
  const [pricingSearch, setPricingSearch] = useState('');
  const [pricingPosition, setPricingPosition] = useState('all');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, number>>({});
  const [bulkPrice, setBulkPrice] = useState(75);
  const games = useQuery({ queryKey: ['admin-fantasy-games'], queryFn: api.getAdminFantasyGames });
  const competitions = useQuery({
    queryKey: ['fantasy-form', 'competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });
  const selectedCompetition = useQuery({
    queryKey: ['fantasy-form', 'competition', form.competitionUuid],
    queryFn: () => api.getCompetition(form.competitionUuid),
    enabled: Boolean(form.competitionUuid),
  });
  const seasons = selectedCompetition.data?.seasons ?? [];
  const activeGameUuid = selectedGameUuid || games.data?.[0]?.uuid || '';
  const rules = useQuery({
    queryKey: ['admin-fantasy-rules', activeGameUuid],
    queryFn: () => api.getFantasyRules(activeGameUuid),
    enabled: Boolean(activeGameUuid),
  });
  const gameweeks = useQuery({
    queryKey: ['admin-fantasy-gameweeks', activeGameUuid],
    queryFn: () => api.getFantasyGameweeks(activeGameUuid),
    enabled: Boolean(activeGameUuid),
  });
  const pricing = useQuery({
    queryKey: ['admin-fantasy-pricing', activeGameUuid],
    queryFn: () => api.getFantasyPricing(activeGameUuid),
    enabled: Boolean(activeGameUuid),
  });
  const selectedCompetitionName = useMemo(
    () => competitions.data?.items.find((item) => item.uuid === form.competitionUuid)?.name ?? '',
    [competitions.data?.items, form.competitionUuid],
  );

  useEffect(() => {
    const firstSeason = seasons[0];
    if (!form.seasonUuid && firstSeason)
      setForm((current) => ({ ...current, seasonUuid: firstSeason.uuid }));
  }, [form.seasonUuid, seasons]);

  const create = useMutation({
    mutationFn: () =>
      api.createFantasyGame({
        ...form,
        name: form.name || `${selectedCompetitionName} Fantasy`,
        deadlineAt: toUtcDatabaseDate(form.deadlineAt),
      }),
    onSuccess: () => {
      setOpen(false);
      setForm(initialForm);
      void client.invalidateQueries({ queryKey: ['admin-fantasy-games'] });
      void client.invalidateQueries({ queryKey: ['fantasy', 'games'] });
    },
  });
  const update = useMutation({
    mutationFn: () =>
      api.updateFantasyGame(editingUuid, {
        name: form.name,
        description: form.description,
        status: form.status,
        budgetCents: form.budgetCents,
        squadSize: form.squadSize,
        startingSize: form.startingSize,
        benchSize: form.benchSize,
        maxPlayersPerTeam: form.maxPlayersPerTeam,
      }),
    onSuccess: () => {
      closeDialog();
      void client.invalidateQueries({ queryKey: ['admin-fantasy-games'] });
      void client.invalidateQueries({ queryKey: ['fantasy', 'games'] });
    },
  });
  const seedRules = useMutation({
    mutationFn: () => api.seedFantasyRules(activeGameUuid),
    onSuccess: (data) => client.setQueryData(['admin-fantasy-rules', activeGameUuid], data),
  });
  const addRule = useMutation({
    mutationFn: () =>
      api.createFantasyRule(activeGameUuid, {
        sportSlug: 'flag-football',
        eventType: ruleEvent,
        points: rulePoints,
        version: Math.max(0, ...(rules.data?.map((rule) => rule.version) ?? [])) + 1,
        effectiveFrom: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['admin-fantasy-rules', activeGameUuid] }),
  });
  const recalculate = useMutation({
    mutationFn: () => api.recalculateFantasy(activeGameUuid, reason),
  });
  const finalize = useMutation({
    mutationFn: () => api.finalizeFantasyGameweek(activeGameUuid, reason),
  });
  const createGameweek = useMutation({
    mutationFn: () =>
      api.createFantasyGameweek(activeGameUuid, {
        name: gameweekName || `Gameweek ${(gameweeks.data?.length ?? 0) + 1}`,
        deadlineAt: toUtcDatabaseDate(gameweekDeadline),
      }),
    onSuccess: () => {
      setGameweekName('');
      setGameweekDeadline('');
      void client.invalidateQueries({ queryKey: ['admin-fantasy-gameweeks', activeGameUuid] });
    },
  });
  const changeGameweek = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: 'scheduled' | 'open' | 'locked' }) =>
      api.setFantasyGameweekStatus(activeGameUuid, uuid, status),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['admin-fantasy-gameweeks', activeGameUuid] }),
  });
  const savePrices = useMutation({
    mutationFn: (updates: Array<{ fantasyPlayerUuid: string; priceCents: number }>) =>
      api.updateFantasyPricing(activeGameUuid, updates),
    onSuccess: (data) => {
      client.setQueryData(['admin-fantasy-pricing', activeGameUuid], data);
      setPriceDrafts({});
      void client.invalidateQueries({ queryKey: ['fantasy', 'players', activeGameUuid] });
    },
  });
  const pricingPlayers = pricing.data?.players ?? [];
  const positions = useMemo(
    () => [...new Set(pricingPlayers.map((player) => player.position.code))].sort(),
    [pricingPlayers],
  );
  const visiblePricingPlayers = useMemo(() => {
    const term = pricingSearch.trim().toLocaleLowerCase();
    return pricingPlayers.filter(
      (player) =>
        (pricingPosition === 'all' || player.position.code === pricingPosition) &&
        (!term ||
          player.player.name.toLocaleLowerCase().includes(term) ||
          player.team.name.toLocaleLowerCase().includes(term)),
    );
  }, [pricingPlayers, pricingPosition, pricingSearch]);
  const sizesValid = form.startingSize + form.benchSize === form.squadSize;
  const canCreate = Boolean(
    form.competitionUuid && form.seasonUuid && form.deadlineAt && sizesValid,
  );

  return (
    <PageScaffold
      eyebrow="Fantasy admin"
      title="Fantasy game manager"
      description="Launch a complete fantasy game from a competition season. InstaScore creates the gameweek, flag-football positions and eligible player pool automatically."
      status="Administrator"
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h3">Fantasy games</Typography>
          <Typography color="text.secondary">
            CFFL and future flag leagues remain isolated by competition and season.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setEditingUuid('');
            setForm(initialForm);
            setOpen(true);
          }}
        >
          Create fantasy game
        </Button>
      </Stack>

      {games.isLoading ? <LoadingState label="Loading fantasy games" /> : null}
      {games.isError ? <ErrorState description="Fantasy games could not be loaded." /> : null}
      {games.data?.length === 0 ? (
        <EmptyState
          title="No fantasy games yet"
          description="Create the first game from CFFL Lagos or another registered flag-football league."
        />
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
          mt: 3,
        }}
      >
        {games.data?.map((game) => (
          <Box className="instascore-panel" key={game.uuid}>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h4">{game.name}</Typography>
                <Typography color="text.secondary">{game.sport.name}</Typography>
              </Box>
              <Chip label={game.status} color={game.status === 'draft' ? 'default' : 'success'} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
              <Chip label={`${game.squadSize} players`} variant="outlined" />
              <Chip label={`${game.startingSize} starters`} variant="outlined" />
              <Chip label={`${game.benchSize} bench`} variant="outlined" />
              <Chip label={`${game.maxPlayersPerTeam} per team`} variant="outlined" />
            </Stack>
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => {
                setEditingUuid(game.uuid);
                setForm({
                  ...initialForm,
                  name: game.name,
                  description: game.description,
                  status: game.status as 'draft' | 'open' | 'active',
                  budgetCents: game.budgetCents,
                  squadSize: game.squadSize,
                  startingSize: game.startingSize,
                  benchSize: game.benchSize,
                  maxPlayersPerTeam: game.maxPlayersPerTeam,
                });
                setOpen(true);
              }}
            >
              Edit fantasy game
            </Button>
          </Box>
        ))}
      </Box>

      {games.data?.length ? (
        <Box className="instascore-panel" sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h3">Season player pricing</Typography>
              <Typography color="text.secondary">
                Prices belong only to the selected fantasy season. Set opening values before the
                first squad is submitted.
              </Typography>
            </Box>
            <TextField
              select
              label="Fantasy season"
              value={activeGameUuid}
              onChange={(event) => {
                setSelectedGameUuid(event.target.value);
                setPriceDrafts({});
              }}
            >
              {games.data.map((game) => (
                <MenuItem key={game.uuid} value={game.uuid}>
                  {game.name}
                  {game.season?.name ? ` · ${game.season.name}` : ''}
                </MenuItem>
              ))}
            </TextField>
            {pricing.data?.locked ? (
              <Alert severity="warning">
                Opening prices are locked because a manager has submitted a squad. Create the next
                season's fantasy game to set a new price list.
              </Alert>
            ) : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Search players or teams"
                value={pricingSearch}
                onChange={(event) => setPricingSearch(event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Position"
                value={pricingPosition}
                onChange={(event) => setPricingPosition(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All positions</MenuItem>
                {positions.map((position) => (
                  <MenuItem key={position} value={position}>
                    {position}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Bulk price (₦)"
                type="number"
                value={bulkPrice}
                inputProps={{ min: 1, step: 0.5 }}
                onChange={(event) => setBulkPrice(Number(event.target.value))}
                sx={{ minWidth: 160 }}
              />
              <Button
                variant="outlined"
                disabled={pricing.data?.locked || visiblePricingPlayers.length === 0}
                onClick={() =>
                  setPriceDrafts((current) => ({
                    ...current,
                    ...Object.fromEntries(
                      visiblePricingPlayers.map((player) => [player.uuid, toCents(bulkPrice)]),
                    ),
                  }))
                }
              >
                Apply to filtered
              </Button>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => exportPricingCsv(pricingPlayers)}>
                Export CSV
              </Button>
              <Button component="label" variant="outlined" disabled={pricing.data?.locked}>
                Import CSV
                <input
                  hidden
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importPricingCsv(file, pricingPlayers, setPriceDrafts);
                    event.target.value = '';
                  }}
                />
              </Button>
              <Button
                variant="contained"
                disabled={
                  pricing.data?.locked ||
                  Object.keys(priceDrafts).length === 0 ||
                  savePrices.isPending
                }
                onClick={() =>
                  savePrices.mutate(
                    Object.entries(priceDrafts).map(([fantasyPlayerUuid, priceCents]) => ({
                      fantasyPlayerUuid,
                      priceCents,
                    })),
                  )
                }
              >
                Save {Object.keys(priceDrafts).length || ''} prices
              </Button>
            </Stack>
            {pricing.isLoading ? <LoadingState label="Loading season prices" /> : null}
            {pricing.isError ? (
              <ErrorState description="Season prices could not be loaded." />
            ) : null}
            <Stack divider={<Divider />}>
              {visiblePricingPlayers.map((player) => (
                <Stack
                  key={player.uuid}
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                  gap={1}
                  sx={{ py: 1 }}
                >
                  <Box>
                    <Typography fontWeight={900}>{player.player.name}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {player.team.name} · {player.position.name}
                    </Typography>
                  </Box>
                  <TextField
                    label="Price (₦)"
                    type="number"
                    size="small"
                    value={fromCents(priceDrafts[player.uuid] ?? player.priceCents)}
                    disabled={pricing.data?.locked}
                    inputProps={{ min: 1, step: 0.5 }}
                    onChange={(event) =>
                      setPriceDrafts((current) => ({
                        ...current,
                        [player.uuid]: toCents(Number(event.target.value)),
                      }))
                    }
                    sx={{ width: { xs: '100%', sm: 150 } }}
                  />
                </Stack>
              ))}
            </Stack>
            {pricing.data && visiblePricingPlayers.length === 0 ? (
              <EmptyState
                title="No players match"
                description="Change the search or position filter to see this season's players."
              />
            ) : null}
            {savePrices.isSuccess ? <Alert severity="success">Season prices saved.</Alert> : null}
            {savePrices.isError ? (
              <Alert severity="error">
                Prices could not be saved. They may have locked after a squad submission.
              </Alert>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {games.data?.length ? (
        <Box className="instascore-panel" sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h3">Scoring rules and gameweek control</Typography>
              <Typography color="text.secondary">
                Point changes create new rule versions; earlier calculated history remains
                auditable.
              </Typography>
            </Box>
            <TextField
              select
              label="Fantasy game"
              value={activeGameUuid}
              onChange={(event) => setSelectedGameUuid(event.target.value)}
            >
              {games.data.map((game) => (
                <MenuItem key={game.uuid} value={game.uuid}>
                  {game.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Match event"
                value={ruleEvent}
                onChange={(event) => setRuleEvent(event.target.value)}
                fullWidth
              >
                {scoringEvents.map((event) => (
                  <MenuItem key={event} value={event}>
                    {event.replaceAll('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Points"
                type="number"
                value={rulePoints}
                onChange={(event) => setRulePoints(Number(event.target.value))}
                fullWidth
              />
              <Button
                variant="outlined"
                disabled={addRule.isPending}
                onClick={() => addRule.mutate()}
              >
                Add rule version
              </Button>
              <Button
                variant="outlined"
                disabled={seedRules.isPending}
                onClick={() => seedRules.mutate()}
              >
                Restore missing defaults
              </Button>
            </Stack>
            {rules.isLoading ? <LoadingState label="Loading scoring rules" /> : null}
            <Stack divider={<Divider />}>
              {rules.data?.map((rule) => (
                <Stack
                  key={rule.uuid}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 1 }}
                >
                  <Box>
                    <Typography fontWeight={900}>{rule.eventType.replaceAll('_', ' ')}</Typography>
                    <Typography color="text.secondary">
                      Version {rule.version} · effective{' '}
                      {new Date(rule.effectiveFrom.replace(' ', 'T') + 'Z').toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${rule.points > 0 ? '+' : ''}${rule.points} pts`}
                    color={rule.points < 0 ? 'error' : 'primary'}
                  />
                </Stack>
              ))}
            </Stack>
            <Divider />
            <Box>
              <Typography variant="h3">Gameweek lifecycle</Typography>
              <Typography color="text.secondary">
                Create the next round, roll every manager's latest squad forward as a draft, then
                open or lock entries deliberately.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Gameweek name"
                value={gameweekName}
                onChange={(event) => setGameweekName(event.target.value)}
                fullWidth
              />
              <TextField
                label="Deadline"
                type="datetime-local"
                value={gameweekDeadline}
                onChange={(event) => setGameweekDeadline(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Button
                variant="outlined"
                disabled={!gameweekDeadline || createGameweek.isPending}
                onClick={() => createGameweek.mutate()}
              >
                Create next gameweek
              </Button>
            </Stack>
            <Stack divider={<Divider />}>
              {gameweeks.data?.map((gameweek) => (
                <Stack
                  key={gameweek.uuid}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  gap={1}
                  sx={{ py: 1 }}
                >
                  <Box>
                    <Typography fontWeight={900}>
                      {gameweek.sequenceNumber}. {gameweek.name}
                    </Typography>
                    <Typography color="text.secondary">
                      {new Date(gameweek.deadlineAt.replace(' ', 'T') + 'Z').toLocaleString()} ·{' '}
                      {gameweek.status}
                    </Typography>
                  </Box>
                  {gameweek.status !== 'completed' ? (
                    <Stack direction="row" gap={1}>
                      {(['scheduled', 'open', 'locked'] as const).map((status) => (
                        <Button
                          key={status}
                          size="small"
                          variant={gameweek.status === status ? 'contained' : 'outlined'}
                          disabled={changeGameweek.isPending}
                          onClick={() => changeGameweek.mutate({ uuid: gameweek.uuid, status })}
                        >
                          {status}
                        </Button>
                      ))}
                    </Stack>
                  ) : (
                    <Chip label="Completed" color="success" />
                  )}
                </Stack>
              ))}
            </Stack>
            {createGameweek.isError || changeGameweek.isError ? (
              <Alert severity="error">
                The gameweek change could not be saved. Check the deadline and lifecycle state.
              </Alert>
            ) : null}
            <Divider />
            <TextField
              label="Audit reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              helperText="Required when finalising; saved with the point revision audit."
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                disabled={!activeGameUuid || recalculate.isPending}
                onClick={() => recalculate.mutate()}
              >
                Recalculate provisional points
              </Button>
              <Button
                color="success"
                variant="outlined"
                disabled={!activeGameUuid || !reason.trim() || finalize.isPending}
                onClick={() => finalize.mutate()}
              >
                Finalise gameweek
              </Button>
            </Stack>
            {recalculate.data ? (
              <Alert severity="success">
                Processed {recalculate.data.fixturesProcessed} fixtures and{' '}
                {recalculate.data.eventsScored} scoring events; {recalculate.data.revisionsCreated}{' '}
                point revisions created.
              </Alert>
            ) : null}
            {finalize.data ? (
              <Alert severity="success">Gameweek points are confirmed and locked.</Alert>
            ) : null}
            {recalculate.isError || finalize.isError || addRule.isError ? (
              <Alert severity="error">
                The fantasy scoring change could not be completed. Review the gameweek state and
                audit reason.
              </Alert>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>
          {editingUuid ? 'Edit fantasy game' : 'Create a competition fantasy game'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!editingUuid ? (
              <>
                <TextField
                  select
                  label="Competition"
                  value={form.competitionUuid}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      competitionUuid: event.target.value,
                      seasonUuid: '',
                    }))
                  }
                >
                  {competitions.data?.items.map((competition) => (
                    <MenuItem key={competition.uuid} value={competition.uuid}>
                      {competition.name} · {competition.sport.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Season"
                  value={form.seasonUuid}
                  disabled={!form.competitionUuid || selectedCompetition.isLoading}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, seasonUuid: event.target.value }))
                  }
                >
                  {seasons.map((season) => (
                    <MenuItem key={season.uuid} value={season.uuid}>
                      {season.name}
                    </MenuItem>
                  ))}
                </TextField>
                {form.competitionUuid && !selectedCompetition.isLoading && seasons.length === 0 ? (
                  <Alert severity="warning">This competition needs an active season first.</Alert>
                ) : null}
              </>
            ) : (
              <Alert severity="info">
                Competition and season cannot be changed after creation because squads, players and
                scoring history are attached to them.
              </Alert>
            )}
            <TextField
              label="Fantasy game name"
              placeholder={selectedCompetitionName ? `${selectedCompetitionName} Fantasy` : ''}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              multiline
              minRows={2}
            />
            <TextField
              select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as 'draft' | 'open' | 'active',
                }))
              }
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="active">Active</MenuItem>
            </TextField>
            {!editingUuid ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Opening gameweek"
                  value={form.gameweekName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, gameweekName: event.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  label="Squad deadline"
                  type="datetime-local"
                  value={form.deadlineAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, deadlineAt: event.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
            ) : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {(['squadSize', 'startingSize', 'benchSize', 'maxPlayersPerTeam'] as const).map(
                (field) => (
                  <TextField
                    key={field}
                    label={fieldLabel(field)}
                    type="number"
                    value={form[field]}
                    inputProps={{ min: field === 'benchSize' ? 0 : 1 }}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field]: Number(event.target.value) }))
                    }
                    error={!sizesValid && field !== 'maxPlayersPerTeam'}
                    fullWidth
                  />
                ),
              )}
            </Stack>
            {!sizesValid ? (
              <Alert severity="error">Starters plus bench must equal the full squad size.</Alert>
            ) : null}
            <TextField
              label="Fantasy budget (minor units)"
              type="number"
              value={form.budgetCents}
              onChange={(event) =>
                setForm((current) => ({ ...current, budgetCents: Number(event.target.value) }))
              }
            />
            {create.isError || update.isError ? (
              <Alert severity="error">
                The fantasy game could not be saved. Check the status, budget and squad rules.
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              editingUuid
                ? !form.name.trim() || !sizesValid || update.isPending
                : !canCreate || create.isPending
            }
            onClick={() => (editingUuid ? update.mutate() : create.mutate())}
          >
            {editingUuid ? 'Save changes' : 'Create game and player pool'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );

  function closeDialog() {
    setOpen(false);
    setEditingUuid('');
    setForm(initialForm);
  }
}

function toUtcDatabaseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 19).replace('T', ' ');
}

function fieldLabel(field: 'squadSize' | 'startingSize' | 'benchSize' | 'maxPlayersPerTeam') {
  return {
    squadSize: 'Squad size',
    startingSize: 'Starters',
    benchSize: 'Bench',
    maxPlayersPerTeam: 'Maximum per real team',
  }[field];
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function fromCents(value: number) {
  return Number((value / 100).toFixed(2));
}

function exportPricingCsv(
  players: Array<{
    uuid: string;
    player: { name: string };
    team: { name: string };
    position: { code: string };
    priceCents: number;
  }>,
) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    'fantasy_player_uuid,player_name,team,position,price',
    ...players.map((player) =>
      [
        player.uuid,
        player.player.name,
        player.team.name,
        player.position.code,
        fromCents(player.priceCents),
      ]
        .map((value) => escape(String(value)))
        .join(','),
    ),
  ];
  const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'instascore-fantasy-season-prices.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function importPricingCsv(
  file: File,
  players: Array<{ uuid: string }>,
  setDrafts: Dispatch<SetStateAction<Record<string, number>>>,
) {
  const known = new Set(players.map((player) => player.uuid));
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
  const drafts: Record<string, number> = {};
  for (const line of lines.slice(1)) {
    const columns = parseCsvLine(line);
    const uuid = (columns[0] ?? '').trim();
    const price = Number((columns[4] ?? '').trim());
    if (known.has(uuid) && Number.isFinite(price) && price >= 1) drafts[uuid] = toCents(price);
  }
  setDrafts((current) => ({ ...current, ...drafts }));
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

const scoringEvents = [
  'touchdown',
  'passing_touchdown',
  'rushing_touchdown',
  'receiving_touchdown',
  'one_point_conversion',
  'two_point_conversion',
  'interception',
  'safety',
  'flag_pull',
  'player_of_the_match',
  'penalty',
];
