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

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

const initialForm = {
  competitionUuid: '',
  seasonUuid: '',
  name: '',
  description: '',
  status: 'open' as const,
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
  const [form, setForm] = useState(initialForm);
  const [selectedGameUuid, setSelectedGameUuid] = useState('');
  const [reason, setReason] = useState('Verified against official match events.');
  const [ruleEvent, setRuleEvent] = useState('touchdown');
  const [rulePoints, setRulePoints] = useState(6);
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
        <Button variant="contained" onClick={() => setOpen(true)}>
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
          </Box>
        ))}
      </Box>

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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create a competition fantasy game</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
            <TextField
              label="Fantasy game name"
              placeholder={selectedCompetitionName ? `${selectedCompetitionName} Fantasy` : ''}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
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
            {create.isError ? (
              <Alert severity="error">
                The fantasy game could not be created. Check the season, deadline and squad rules.
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canCreate || create.isPending}
            onClick={() => create.mutate()}
          >
            Create game and player pool
          </Button>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );
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
