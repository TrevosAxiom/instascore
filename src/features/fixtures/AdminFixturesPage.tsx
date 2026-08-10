import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router';
import { z } from 'zod';

import { ApiError } from '../../api/client';
import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import type { Fixture, FixtureStatus } from '../../types/api';
import { fixtureTitle, formatKickoff, statusLabel } from './fixtureFormat';

const fixtureSchema = z
  .object({
    competitionUuid: z.string().uuid('Select a competition.'),
    seasonUuid: z.string().uuid('Select a season.'),
    homeTeamUuid: z.string().uuid('Select the home team.'),
    awayTeamUuid: z.string().uuid('Select the away team.'),
    venueUuid: z.string().optional(),
    kickoffAt: z.string().min(1, 'Choose a kickoff date and time.'),
    timezone: z.string().min(1),
    roundName: z.string().max(100).optional(),
    matchDay: z.string().regex(/^$|^[1-9]\d*$/, 'Use a positive match-day number.'),
    bracketSlot: z.string().max(100).optional(),
    status: z.enum(['draft', 'scheduled']),
  })
  .refine((value) => value.homeTeamUuid !== value.awayTeamUuid, {
    path: ['awayTeamUuid'],
    message: 'Home and away teams must be different.',
  });

type FixtureForm = z.infer<typeof fixtureSchema>;

const emptyFixture: FixtureForm = {
  competitionUuid: '',
  seasonUuid: '',
  homeTeamUuid: '',
  awayTeamUuid: '',
  venueUuid: '',
  kickoffAt: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  roundName: '',
  matchDay: '',
  bracketSlot: '',
  status: 'draft',
};

const nextStatuses: Partial<Record<FixtureStatus, FixtureStatus[]>> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['draft', 'postponed', 'cancelled'],
  postponed: ['scheduled', 'cancelled'],
  suspended: ['scheduled', 'postponed', 'cancelled'],
};

function localInputValue(value: string) {
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AdminFixturesPage() {
  const api = useApi();
  const client = useQueryClient();
  const [view, setView] = useState<'list' | 'calendar' | 'day'>('list');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fixture | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sport, setSport] = useState('');
  const [date, setDate] = useState('');
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({ per_page: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (sport) params.set('sport', sport);
    if (view === 'day' && date) params.set('date', date);
    return params;
  }, [date, search, sport, status, view]);
  const query = useQuery({
    queryKey: ['admin-fixtures', queryParams.toString()],
    queryFn: () => api.getAdminFixtures(queryParams),
  });
  const competitions = useQuery({
    queryKey: ['fixture-form', 'competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });
  const teams = useQuery({
    queryKey: ['fixture-form', 'teams'],
    queryFn: () => api.getTeams(new URLSearchParams({ per_page: '50' })),
  });
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const venues = useQuery({ queryKey: ['fixture-form', 'venues'], queryFn: api.getVenues });
  const form = useForm<FixtureForm>({
    resolver: zodResolver(fixtureSchema),
    defaultValues: emptyFixture,
  });
  const competitionUuid = form.watch('competitionUuid');
  const homeTeamUuid = form.watch('homeTeamUuid');
  const selectedCompetition = useQuery({
    queryKey: ['fixture-form', 'competition', competitionUuid],
    queryFn: () => api.getCompetition(competitionUuid),
    enabled: Boolean(competitionUuid),
  });
  const save = useMutation({
    mutationFn: (input: FixtureForm) =>
      editing ? api.updateFixture(editing.uuid, input) : api.createFixture(input),
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      form.reset(emptyFixture);
      void client.invalidateQueries({ queryKey: ['admin-fixtures'] });
      void client.invalidateQueries({ queryKey: ['fixtures'] });
    },
  });
  const changeStatus = useMutation({
    mutationFn: ({ uuid, next }: { uuid: string; next: FixtureStatus }) =>
      api.updateFixtureStatus(uuid, { status: next, reason: 'Updated in Fixture Manager.' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-fixtures'] });
      void client.invalidateQueries({ queryKey: ['fixtures'] });
    },
  });
  const editFixture = (fixture: Fixture) => {
    setEditing(fixture);
    form.reset({
      competitionUuid: fixture.competition.uuid,
      seasonUuid: fixture.season.uuid,
      homeTeamUuid: fixture.homeTeam.uuid,
      awayTeamUuid: fixture.awayTeam.uuid,
      venueUuid: fixture.venue?.uuid ?? '',
      kickoffAt: localInputValue(fixture.kickoffAt),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      roundName: fixture.roundName,
      matchDay: fixture.matchDay ? String(fixture.matchDay) : '',
      bracketSlot: fixture.bracketSlot,
      status: fixture.status === 'draft' ? 'draft' : 'scheduled',
    });
    setOpen(true);
  };
  const fixtures = query.data?.items ?? [];
  const liveCount = fixtures.filter((item) =>
    ['live', 'halftime', 'interval'].includes(item.status),
  ).length;
  const grouped = fixtures.reduce<Record<string, Fixture[]>>((groups, fixture) => {
    const key = new Date(fixture.kickoffAt.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    groups[key] = [...(groups[key] ?? []), fixture];
    return groups;
  }, {});

  return (
    <PageScaffold
      eyebrow="Match operations"
      title="Fixture Manager"
      description="Build, review and publish every match from one schedule. Drafts remain private until you are ready."
      status={`${query.data?.total ?? 0} fixtures`}
    >
      <Grid container spacing={1.5}>
        {[
          ['All fixtures', query.data?.total ?? 0],
          ['Live now', liveCount],
          ['Drafts', fixtures.filter((item) => item.status === 'draft').length],
          ['Needs venue', fixtures.filter((item) => !item.venue).length],
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 6, md: 3 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h5" fontWeight={950}>
                {value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
            <Tabs
              value={view}
              onChange={(_event, value: 'list' | 'calendar' | 'day') => setView(value)}
            >
              <Tab value="list" label="List" />
              <Tab value="calendar" label="Calendar" />
              <Tab value="day" label="Match day" />
            </Tabs>
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                form.reset(emptyFixture);
                setOpen(true);
              }}
            >
              Create fixture
            </Button>
          </Stack>
          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Search teams or competition"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2.5 }}>
              <TextField
                fullWidth
                select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <MenuItem value="">All statuses</MenuItem>
                {[
                  'draft',
                  'scheduled',
                  'live',
                  'postponed',
                  'completed',
                  'confirmed',
                  'cancelled',
                ].map((item) => (
                  <MenuItem key={item} value={item}>
                    {statusLabel(item as FixtureStatus)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 2.5 }}>
              <TextField
                fullWidth
                select
                label="Sport"
                value={sport}
                onChange={(event) => setSport(event.target.value)}
              >
                <MenuItem value="">All sports</MenuItem>
                {(sports.data ?? []).map((item) => (
                  <MenuItem key={item.uuid} value={item.slug}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {view === 'day' && (
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Match date"
                  InputLabelProps={{ shrink: true }}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Grid>
            )}
          </Grid>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="UTC storage · local display" />
            <Chip label="Conflict detection active" />
            {(search || status || sport || date) && (
              <Button
                size="small"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setSport('');
                  setDate('');
                }}
              >
                Clear filters
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {query.isLoading && <LoadingState label="Loading fixture schedule" />}
      {query.isError && <ErrorState title="Fixture schedule could not be loaded." />}
      {!query.isLoading && fixtures.length === 0 && (
        <EmptyState
          title="No matching fixtures"
          description="Adjust the filters or create a new match."
        />
      )}
      <Stack spacing={2}>
        {Object.entries(grouped).map(([groupDate, items]) => (
          <Box key={groupDate}>
            <Typography variant="overline" fontWeight={900}>
              {groupDate}
            </Typography>
            <Stack spacing={1} sx={{ mt: 0.75 }}>
              {items.map((fixture) => (
                <Paper
                  key={fixture.uuid}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderLeft: '5px solid',
                    borderLeftColor: fixture.status === 'live' ? 'error.main' : 'primary.main',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    gap={2}
                  >
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography fontWeight={950}>{fixtureTitle(fixture)}</Typography>
                        <Chip
                          size="small"
                          label={statusLabel(fixture.status)}
                          color={fixture.status === 'live' ? 'error' : 'primary'}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {fixture.sport.name} · {fixture.competition.name} · {fixture.season.name}
                      </Typography>
                      <Typography variant="body2">
                        {formatKickoff(fixture)} · {fixture.venue?.name ?? 'Venue not assigned'}
                      </Typography>
                      {(fixture.roundName || fixture.matchDay) && (
                        <Typography variant="caption" color="text.secondary">
                          {fixture.roundName || 'Round'}
                          {fixture.matchDay ? ` · Match day ${fixture.matchDay}` : ''}
                        </Typography>
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Button
                        variant="outlined"
                        onClick={() => editFixture(fixture)}
                        disabled={['confirmed', 'live'].includes(fixture.status)}
                      >
                        Edit
                      </Button>
                      {(nextStatuses[fixture.status] ?? []).map((next) => (
                        <Button
                          key={next}
                          size="small"
                          onClick={() => changeStatus.mutate({ uuid: fixture.uuid, next })}
                        >
                          {statusLabel(next)}
                        </Button>
                      ))}
                      <Button component={RouterLink} to={`/fixtures/${fixture.uuid}`} size="small">
                        Open match
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Edit fixture' : 'Create fixture'}</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            spacing={2.25}
            sx={{ pt: 1 }}
            onSubmit={(event) => void form.handleSubmit((values) => save.mutate(values))(event)}
          >
            <Alert severity="info">
              Competition and season determine where this fixture appears. Save as draft while
              details are incomplete, then publish as scheduled.
            </Alert>
            <Typography fontWeight={900}>Competition</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={form.control}
                  name="competitionUuid"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Competition"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      onChange={(event) => {
                        field.onChange(event);
                        form.setValue('seasonUuid', '');
                      }}
                    >
                      <MenuItem value="">Select competition</MenuItem>
                      {(competitions.data?.items ?? []).map((item) => (
                        <MenuItem key={item.uuid} value={item.uuid}>
                          {item.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={form.control}
                  name="seasonUuid"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Season"
                      disabled={!competitionUuid}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    >
                      <MenuItem value="">Select season</MenuItem>
                      {(selectedCompetition.data?.seasons ?? []).map((item) => (
                        <MenuItem key={item.uuid} value={item.uuid}>
                          {item.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
            <Divider />
            <Typography fontWeight={900}>Match-up</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={form.control}
                  name="homeTeamUuid"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Home team"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    >
                      <MenuItem value="">Select home team</MenuItem>
                      {(teams.data?.items ?? []).map((item) => (
                        <MenuItem key={item.uuid} value={item.uuid}>
                          {item.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={form.control}
                  name="awayTeamUuid"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Away team"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    >
                      <MenuItem value="">Select away team</MenuItem>
                      {(teams.data?.items ?? [])
                        .filter((item) => item.uuid !== homeTeamUuid)
                        .map((item) => (
                          <MenuItem key={item.uuid} value={item.uuid}>
                            {item.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
            <Divider />
            <Typography fontWeight={900}>Schedule and match details</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={form.control}
                  name="kickoffAt"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="datetime-local"
                      label="Kickoff"
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  control={form.control}
                  name="venueUuid"
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="Venue">
                      <MenuItem value="">Venue TBC</MenuItem>
                      {(venues.data ?? []).map((item) => (
                        <MenuItem key={item.uuid} value={item.uuid}>
                          {item.name} · {item.city}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Round / phase" {...form.register('roundName')} />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Match day"
                  {...form.register('matchDay')}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField fullWidth label="Bracket slot" {...form.register('bracketSlot')} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="Visibility">
                      <MenuItem value="draft">Draft · private</MenuItem>
                      <MenuItem value="scheduled">Scheduled · public</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
            {save.isError && (
              <Alert severity="error">
                {save.error instanceof ApiError
                  ? save.error.message
                  : 'Fixture could not be saved.'}
              </Alert>
            )}
            {save.data?.warnings.map((warning) => (
              <Alert key={`${warning.fixture}-${warning.kickoffAt}`} severity="warning">
                {warning.message}
              </Alert>
            ))}
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={save.isPending}>
                {editing ? 'Save changes' : 'Create fixture'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </PageScaffold>
  );
}
