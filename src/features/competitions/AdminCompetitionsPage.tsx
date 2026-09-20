import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../api/client';
import { useApi } from '../../api/context';
import { LoadingState } from '../../components/AsyncStates';
import { MediaUploadField } from '../../components/MediaUploadField';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import type { Competition, MediaUpload, Season, Sport } from '../../types/api';

const countries = [
  ['NG', 'Nigeria'],
  ['GH', 'Ghana'],
  ['KE', 'Kenya'],
  ['ZA', 'South Africa'],
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
  ['CA', 'Canada'],
] as const;

const competitionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sportUuid: z.string().uuid('Select a sport.'),
  type: z.enum(['league', 'cup', 'tournament', 'friendly', 'group']),
  description: z.string().max(2000),
  countryCode: z.string().max(2),
  pointsWin: z.number().int().min(0).max(20),
  pointsDraw: z.number().int().min(0).max(20),
  pointsLoss: z.number().int().min(0).max(20),
  tiebreakers: z.array(z.string()).min(1),
});
type CompetitionForm = z.infer<typeof competitionSchema>;

const seasonSchema = z
  .object({
    competitionUuid: z.string().uuid('Select a competition.'),
    name: z.string().trim().min(2).max(120),
    startDate: z.string().date(),
    endDate: z.string().date(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after start date.',
  });
type SeasonForm = z.infer<typeof seasonSchema>;

export function AdminCompetitionsPage() {
  const [tab, setTab] = useState(0);
  return (
    <PageScaffold
      eyebrow="Protected administration"
      title="Competition setup"
      description="Create sports, competitions and seasons in the order fans will see them."
      status="Audited changes"
    >
      <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable">
        {['Sports', 'Competitions & rules', 'Seasons', 'Format & schedule'].map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
      {tab === 0 && <CatalogForm entity="sports" title="Create sport" parentLabel={null} />}
      {tab === 1 && <CompetitionEditor />}
      {tab === 2 && <SeasonEditor />}
      {tab === 3 && <CompetitionStructureEditor />}
    </PageScaffold>
  );
}

function CompetitionStructureEditor() {
  const api = useApi();
  const client = useQueryClient();
  const [competitionUuid, setCompetitionUuid] = useState('');
  const [seasonUuid, setSeasonUuid] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [kickoffTime, setKickoffTime] = useState('15:00');
  const [intervalDays, setIntervalDays] = useState(7);
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(false);
  const [qualifiers, setQualifiers] = useState(4);
  const competitions = useQuery({
    queryKey: ['competitions', 'format-picker'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });
  const activeCompetitionUuid = competitionUuid || competitions.data?.items[0]?.uuid || '';
  const competition = useQuery({
    queryKey: ['competition', activeCompetitionUuid, 'format'],
    queryFn: () => api.getCompetition(activeCompetitionUuid),
    enabled: Boolean(activeCompetitionUuid),
  });
  const activeSeasonUuid =
    seasonUuid ||
    String(competition.data?.rules.default_season_uuid ?? '') ||
    competition.data?.seasons?.[0]?.uuid ||
    '';
  const activeSeason = competition.data?.seasons?.find((item) => item.uuid === activeSeasonUuid);
  useEffect(() => {
    if (activeSeason?.startDate) setStartDate(activeSeason.startDate);
  }, [activeSeason?.startDate]);
  const structure = useQuery({
    queryKey: ['competition-structure', activeCompetitionUuid, activeSeasonUuid],
    queryFn: () => api.getCompetitionStructure(activeCompetitionUuid, activeSeasonUuid),
    enabled: Boolean(activeCompetitionUuid && activeSeasonUuid),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['competition-structure'] });
    void client.invalidateQueries({ queryKey: ['admin-fixtures'] });
    void client.invalidateQueries({ queryKey: ['fixtures'] });
  };
  const generate = useMutation({
    mutationFn: () =>
      api.generateCompetitionFixtures(activeCompetitionUuid, {
        seasonUuid: activeSeasonUuid,
        startDate,
        kickoffTime,
        intervalDays,
        doubleRoundRobin,
      }),
    onSuccess: refresh,
  });
  const playoffs = useMutation({
    mutationFn: () =>
      api.generateCompetitionPlayoffs(activeCompetitionUuid, {
        seasonUuid: activeSeasonUuid,
        startDate,
        kickoffTime,
        qualifiers,
      }),
    onSuccess: refresh,
  });

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Generated fixtures start as drafts. Review venues, officials and kickoff times in Fixture
        Manager before publishing them.
      </Alert>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField
          select
          fullWidth
          label="Competition"
          value={activeCompetitionUuid}
          onChange={(event) => {
            setCompetitionUuid(event.target.value);
            setSeasonUuid('');
          }}
        >
          {(competitions.data?.items ?? []).map((item) => (
            <MenuItem key={item.uuid} value={item.uuid}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          label="Season"
          value={activeSeasonUuid}
          onChange={(event) => setSeasonUuid(event.target.value)}
        >
          {(competition.data?.seasons ?? [])
            .filter((item) => item.status === 'active')
            .map((item) => (
              <MenuItem key={item.uuid} value={item.uuid}>
                {item.name}
              </MenuItem>
            ))}
        </TextField>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={900}>
            Regular-season generator
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              type="date"
              label="First match date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <TextField
              type="time"
              label="Kickoff time"
              InputLabelProps={{ shrink: true }}
              value={kickoffTime}
              onChange={(event) => setKickoffTime(event.target.value)}
            />
            <TextField
              select
              label="Days between rounds"
              value={intervalDays}
              onChange={(event) => setIntervalDays(Number(event.target.value))}
            >
              {[1, 2, 3, 7, 14].map((days) => (
                <MenuItem key={days} value={days}>
                  {days}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Format"
              value={doubleRoundRobin ? 'double' : 'single'}
              onChange={(event) => setDoubleRoundRobin(event.target.value === 'double')}
            >
              <MenuItem value="single">Single round robin</MenuItem>
              <MenuItem value="double">Home and away</MenuItem>
            </TextField>
          </Stack>
          <Button
            variant="contained"
            disabled={!activeSeasonUuid || generate.isPending}
            onClick={() => generate.mutate()}
          >
            Generate league fixtures
          </Button>
          {generate.data ? (
            <Alert severity="success">
              Created {generate.data.created} draft fixtures across {generate.data.rounds} rounds
              for {generate.data.teams} teams.
            </Alert>
          ) : null}
          {generate.isError ? (
            <Alert severity="error">
              {generate.error instanceof ApiError
                ? generate.error.message
                : 'Fixtures could not be generated.'}
            </Alert>
          ) : null}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={900}>
            Playoff seeding
          </Typography>
          <Typography color="text.secondary">
            Seeds are taken from the current confirmed standings: 1 vs last, 2 vs second-last.
          </Typography>
          <TextField
            select
            label="Qualifying teams"
            value={qualifiers}
            onChange={(event) => setQualifiers(Number(event.target.value))}
          >
            {[2, 4, 8].map((count) => (
              <MenuItem key={count} value={count}>
                {count}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            disabled={!activeSeasonUuid || playoffs.isPending}
            onClick={() => playoffs.mutate()}
          >
            Seed playoff bracket
          </Button>
          {playoffs.data ? (
            <Alert severity="success">
              Created {playoffs.data.created} playoff fixtures from {playoffs.data.qualifiers}{' '}
              seeds.
            </Alert>
          ) : null}
          {playoffs.isError ? (
            <Alert severity="error">
              {playoffs.error instanceof ApiError
                ? playoffs.error.message
                : 'Playoffs could not be seeded.'}
            </Alert>
          ) : null}
        </Stack>
      </Paper>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {(structure.data?.stages ?? []).map((stage) => (
          <Chip key={stage.uuid} label={`${stage.name} · ${stage.type}`} />
        ))}
      </Stack>
      {(structure.data?.fixtures ?? []).map((fixture) => (
        <Paper key={fixture.uuid} variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <div>
              <Typography fontWeight={850}>
                {fixture.homeTeam} vs {fixture.awayTeam}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fixture.roundName || fixture.bracketSlot} ·{' '}
                {new Date(`${fixture.kickoffAt.replace(' ', 'T')}Z`).toLocaleString()}
              </Typography>
            </div>
            <Chip size="small" label={fixture.status} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function CompetitionEditor() {
  const api = useApi();
  const queryClient = useQueryClient();
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const competitions = useQuery({
    queryKey: ['competitions', 'admin-list'],
    queryFn: () =>
      api.getCompetitions(new URLSearchParams({ per_page: '50', include_archived: '1' })),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [logo, setLogo] = useState<MediaUpload | null>(null);
  const form = useForm<CompetitionForm>({
    resolver: zodResolver(competitionSchema),
    defaultValues: {
      name: '',
      sportUuid: '',
      type: 'league',
      description: '',
      countryCode: 'NG',
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      tiebreakers: ['points', 'wins', 'point_difference', 'points_for', 'team_name'],
    },
  });
  const mutation = useMutation({
    mutationFn: (values: CompetitionForm) => {
      const input = {
        ...values,
        ...(logo ? { logo } : {}),
        rules: {
          win_points: values.pointsWin,
          draw_points: values.pointsDraw,
          loss_points: values.pointsLoss,
          tiebreakers: values.tiebreakers,
          ...(editing?.rules.default_season_uuid
            ? { default_season_uuid: editing.rules.default_season_uuid }
            : {}),
        },
      };
      return editing ? api.updateCompetition(editing.uuid, input) : api.createCompetition(input);
    },
    onSuccess: () => {
      form.reset();
      setLogo(null);
      setOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'archive' | 'restore' }) =>
      api.changeCompetitionStatus(uuid, action),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['competitions'] }),
  });
  const edit = (competition: Competition) => {
    setEditing(competition);
    setLogo(null);
    form.reset({
      name: competition.name,
      sportUuid: competition.sport.uuid,
      type: competition.type,
      description: competition.description,
      countryCode: competition.countryCode ?? 'NG',
      pointsWin: Number(competition.rules.win_points ?? competition.rules.points_win ?? 3),
      pointsDraw: Number(competition.rules.draw_points ?? competition.rules.points_draw ?? 1),
      pointsLoss: Number(competition.rules.loss_points ?? competition.rules.points_loss ?? 0),
      tiebreakers: Array.isArray(competition.rules.tiebreakers)
        ? competition.rules.tiebreakers.map(String)
        : ['points', 'wins', 'point_difference', 'points_for', 'team_name'],
    });
    setOpen(true);
  };
  if (sports.isLoading) return <LoadingState label="Loading sports" />;
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
        <div>
          <Typography variant="h6">Competitions</Typography>
          <Typography color="text.secondary">{competitions.data?.total ?? 0} records</Typography>
        </div>
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            form.reset();
            setLogo(null);
            setOpen(true);
          }}
        >
          Create competition
        </Button>
      </Stack>
      {(competitions.data?.items ?? []).map((competition) => (
        <Paper key={competition.uuid} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EntityAvatar
              entity="competition"
              src={competition.logoUrl}
              alt={`${competition.name} logo`}
              sx={{ width: 52, height: 52 }}
            />
            <Stack flex={1}>
              <Typography fontWeight={850}>{competition.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {competition.sport.name} · {competition.type} · {competition.status}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => edit(competition)}>
                Edit
              </Button>
              <Button
                color={competition.status === 'archived' ? 'success' : 'error'}
                onClick={() =>
                  statusMutation.mutate({
                    uuid: competition.uuid,
                    action: competition.status === 'archived' ? 'restore' : 'archive',
                  })
                }
              >
                {competition.status === 'archived' ? 'Restore' : 'Archive'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      {competitions.data?.items.length === 0 && (
        <Alert severity="info">No competitions have been created yet.</Alert>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit competition' : 'Create competition and rules'}</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            spacing={2}
            sx={{ pt: 1 }}
            onSubmit={(event) => void form.handleSubmit((data) => mutation.mutate(data))(event)}
          >
            <TextField
              label="Competition name"
              {...form.register('name')}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <Controller
              name="sportUuid"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label="Sport"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                >
                  {(sports.data ?? []).map((sport) => (
                    <MenuItem key={sport.uuid} value={sport.uuid}>
                      {sport.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <TextField {...field} select label="Competition type">
                  {['league', 'cup', 'tournament', 'friendly', 'group'].map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              {...form.register('description')}
            />
            <Controller
              name="countryCode"
              control={form.control}
              render={({ field }) => (
                <TextField {...field} select label="Country">
                  {countries.map(([code, name]) => (
                    <MenuItem key={code} value={code}>
                      {name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <MediaUploadField
              entity="competition"
              label="Competition logo"
              value={logo}
              onChange={setLogo}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {(
                [
                  ['pointsWin', 'Points for a win'],
                  ['pointsDraw', 'Points for a draw'],
                  ['pointsLoss', 'Points for a loss'],
                ] as const
              ).map(([name, label]) => (
                <Controller
                  key={name}
                  name={name}
                  control={form.control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth select label={label}>
                      {[0, 1, 2, 3, 4, 5].map((points) => (
                        <MenuItem key={points} value={points}>
                          {points}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              ))}
            </Stack>
            <Controller
              name="tiebreakers"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  SelectProps={{ multiple: true }}
                  label="Standings tiebreakers (in priority order)"
                  helperText="Selection order determines ranking priority."
                >
                  {[
                    ['points', 'Points'],
                    ['wins', 'Wins'],
                    ['point_difference', 'Point difference'],
                    ['points_for', 'Points scored'],
                    ['head_to_head', 'Head-to-head'],
                    ['team_name', 'Team name'],
                  ].map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {mutation.isError && (
              <Alert severity="error">
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : 'Unable to save competition.'}
              </Alert>
            )}
            {mutation.isSuccess && (
              <Alert severity="success">Competition created and audited.</Alert>
            )}
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {editing ? 'Save changes' : 'Create competition'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function SeasonEditor() {
  const api = useApi();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [selectedCompetitionUuid, setSelectedCompetitionUuid] = useState('');
  const competitions = useQuery({
    queryKey: ['competitions', 'admin-picker'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });
  const activeCompetitionUuid = selectedCompetitionUuid || competitions.data?.items[0]?.uuid || '';
  const competition = useQuery({
    queryKey: ['competition', activeCompetitionUuid],
    queryFn: () =>
      api.getCompetition(activeCompetitionUuid, new URLSearchParams({ include_archived: '1' })),
    enabled: !!activeCompetitionUuid,
  });
  const form = useForm<SeasonForm>({
    resolver: zodResolver(seasonSchema),
    defaultValues: { competitionUuid: '', name: '', startDate: '', endDate: '' },
  });
  const mutation = useMutation({
    mutationFn: ({ competitionUuid, ...values }: SeasonForm) =>
      editing ? api.updateSeason(editing.uuid, values) : api.createSeason(competitionUuid, values),
    onSuccess: () => {
      form.reset();
      setOpen(false);
      setEditing(null);
      void client.invalidateQueries({ queryKey: ['competition', activeCompetitionUuid] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'archive' | 'restore' | 'complete' }) =>
      api.changeSeasonStatus(uuid, action),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['competition', activeCompetitionUuid] }),
  });
  const defaultMutation = useMutation({
    mutationFn: (seasonUuid: string) => api.setDefaultSeason(activeCompetitionUuid, seasonUuid),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['competition', activeCompetitionUuid] }),
  });
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
        <div>
          <Typography variant="h6">Competition seasons</Typography>
          <Typography color="text.secondary">
            Choose a competition to add its next season.
          </Typography>
        </div>
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            form.reset({
              competitionUuid: activeCompetitionUuid,
              name: '',
              startDate: '',
              endDate: '',
            });
            setOpen(true);
          }}
        >
          Create season
        </Button>
      </Stack>
      <TextField
        select
        label="Competition"
        value={activeCompetitionUuid}
        onChange={(event) => setSelectedCompetitionUuid(event.target.value)}
      >
        {(competitions.data?.items ?? []).map((item) => (
          <MenuItem key={item.uuid} value={item.uuid}>
            {item.name}
          </MenuItem>
        ))}
      </TextField>
      {(competition.data?.seasons ?? []).map((season) => (
        <Paper key={season.uuid} variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <div>
              <Typography fontWeight={850}>{season.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {season.startDate} – {season.endDate} · {season.status}
              </Typography>
            </div>
            <Stack direction="row" spacing={1}>
              {season.status === 'active' && (
                <Button
                  variant={
                    competition.data?.rules.default_season_uuid === season.uuid
                      ? 'contained'
                      : 'outlined'
                  }
                  onClick={() => defaultMutation.mutate(season.uuid)}
                  disabled={defaultMutation.isPending}
                >
                  {competition.data?.rules.default_season_uuid === season.uuid
                    ? 'Default season'
                    : 'Set as default'}
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={() => {
                  setEditing(season);
                  form.reset({
                    competitionUuid: activeCompetitionUuid,
                    name: season.name,
                    startDate: season.startDate,
                    endDate: season.endDate,
                  });
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              {season.status === 'active' ? (
                <Button
                  color="success"
                  onClick={() => statusMutation.mutate({ uuid: season.uuid, action: 'complete' })}
                >
                  Complete season
                </Button>
              ) : null}
              <Button
                color={season.status === 'archived' ? 'success' : 'error'}
                onClick={() =>
                  statusMutation.mutate({
                    uuid: season.uuid,
                    action: season.status === 'archived' ? 'restore' : 'archive',
                  })
                }
              >
                {season.status === 'archived' ? 'Restore' : 'Archive'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit season' : 'Create season'}</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            spacing={2}
            sx={{ pt: 1 }}
            onSubmit={(event) => void form.handleSubmit((data) => mutation.mutate(data))(event)}
          >
            <Controller
              name="competitionUuid"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label="Competition"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                >
                  {(competitions.data?.items ?? []).map((competition) => (
                    <MenuItem key={competition.uuid} value={competition.uuid}>
                      {competition.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Season name"
              {...form.register('name')}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <TextField
              label="Start date"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...form.register('startDate')}
              error={!!form.formState.errors.startDate}
              helperText={form.formState.errors.startDate?.message}
            />
            <TextField
              label="End date"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...form.register('endDate')}
              error={!!form.formState.errors.endDate}
              helperText={form.formState.errors.endDate?.message}
            />
            {mutation.isError && (
              <Alert severity="error">
                The season could not be saved. Check dates and overlap.
              </Alert>
            )}
            {mutation.isSuccess && <Alert severity="success">Season saved and audited.</Alert>}
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {editing ? 'Save changes' : 'Create season'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function CatalogForm({
  entity,
  title,
  parentLabel,
}: {
  entity: 'sports' | 'stages' | 'groups';
  title: string;
  parentLabel: string | null;
}) {
  const api = useApi();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sport | null>(null);
  const sports = useQuery({
    queryKey: ['sports', 'admin-list'],
    queryFn: api.getAdminSports,
    enabled: entity === 'sports',
  });
  const [name, setName] = useState('');
  const [parentUuid, setParentUuid] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      entity === 'sports'
        ? editing
          ? api.updateCatalogRecord(entity, editing.uuid, { name })
          : api.createSport({ name })
        : api.createCatalogRecord(entity, { name, parentUuid }),
    onSuccess: () => {
      setName('');
      setParentUuid('');
      setOpen(false);
      setEditing(null);
      void client.invalidateQueries({ queryKey: ['sports'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'archive' | 'restore' }) =>
      api.changeCatalogStatus(entity, uuid, action),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['sports'] }),
  });
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
        <div>
          <Typography variant="h6">Sports</Typography>
          <Typography color="text.secondary">{sports.data?.length ?? 0} records</Typography>
        </div>
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setName('');
            setOpen(true);
          }}
        >
          {title}
        </Button>
      </Stack>
      {(sports.data ?? []).map((sport) => (
        <Paper key={sport.uuid} variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <div>
              <Typography fontWeight={850}>{sport.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {sport.slug} · {sport.status ?? 'active'}
              </Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditing(sport);
                  setName(sport.name);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                color={sport.status === 'archived' ? 'success' : 'error'}
                onClick={() =>
                  statusMutation.mutate({
                    uuid: sport.uuid,
                    action: sport.status === 'archived' ? 'restore' : 'archive',
                  })
                }
              >
                {sport.status === 'archived' ? 'Restore' : 'Archive'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit sport' : title}</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            spacing={2}
            sx={{ pt: 1 }}
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <TextField
              required
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {parentLabel && (
              <TextField
                required
                label={parentLabel}
                value={parentUuid}
                onChange={(event) => setParentUuid(event.target.value)}
              />
            )}
            {mutation.isError && <Alert severity="error">The record could not be saved.</Alert>}
            {mutation.isSuccess && <Alert severity="success">Record saved and audited.</Alert>}
            <Button type="submit" variant="contained" disabled={!name || mutation.isPending}>
              {editing ? 'Save changes' : 'Save'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
