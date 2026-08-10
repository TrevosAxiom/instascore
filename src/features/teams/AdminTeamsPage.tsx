import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ApiError } from '../../api/client';
import { useApi } from '../../api/context';
import { LoadingState } from '../../components/AsyncStates';
import { MediaUploadField } from '../../components/MediaUploadField';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import type { MediaUpload, Official, Player, Sport, Team, Venue } from '../../types/api';

type TeamForm = { name: string; sportUuid: string; shortName: string };
type PlayerForm = {
  firstName: string;
  lastName: string;
  sportUuid: string;
  primaryPosition: string;
  eligibilityStatus: string;
  dateOfBirth: string;
  nationality: string;
  competitionUuid: string;
  teamUuid: string;
  seasonUuid: string;
  jerseyNumber: string;
};

const countries = [
  ['NG', 'Nigeria'],
  ['GH', 'Ghana'],
  ['KE', 'Kenya'],
  ['ZA', 'South Africa'],
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
  ['CA', 'Canada'],
] as const;
const eligibilityOptions = [
  ['eligible', 'Eligible'],
  ['pending', 'Pending review'],
  ['suspended', 'Suspended'],
  ['ineligible', 'Ineligible'],
] as const;
const positions: Record<string, readonly [string, string][]> = {
  flag: [
    ['QB', 'Quarterback'],
    ['WR', 'Wide receiver'],
    ['C', 'Center'],
    ['RB', 'Running back'],
    ['RSH', 'Rusher'],
    ['DB', 'Defensive back'],
    ['S', 'Safety'],
  ],
  football: [
    ['GK', 'Goalkeeper'],
    ['DF', 'Defender'],
    ['MF', 'Midfielder'],
    ['FW', 'Forward'],
  ],
  basketball: [
    ['PG', 'Point guard'],
    ['SG', 'Shooting guard'],
    ['SF', 'Small forward'],
    ['PF', 'Power forward'],
    ['C', 'Center'],
  ],
};

function sportPositions(sports: Sport[] | undefined, uuid: string) {
  const slug = sports?.find((sport) => sport.uuid === uuid)?.slug ?? '';
  return (
    positions[slug] ??
    positions[
      slug.includes('flag') ? 'flag' : slug.includes('basket') ? 'basketball' : 'football'
    ] ??
    []
  );
}
type RegistrationForm = {
  teamUuid: string;
  playerUuid: string;
  seasonUuid: string;
  jerseyNumber: string;
  positionCode: string;
  eligibilityStatus: string;
};

export function AdminTeamsPage() {
  const [tab, setTab] = useState(0);
  return (
    <PageScaffold
      eyebrow="Protected administration"
      title="Teams and registrations"
      description="Manage teams, players, venues, officials and season registration history."
      status="Audited changes"
    >
      <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable">
        {['Teams', 'Players', 'Registrations', 'Venues', 'Officials', 'CSV import'].map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
      {tab === 0 && <TeamFormPanel />}
      {tab === 1 && <PlayerFormPanel />}
      {tab === 2 && <RegistrationPanel />}
      {tab === 3 && (
        <SimplePanel
          title="Create venue"
          fields={['name', 'city', 'countryCode']}
          endpoint="venue"
        />
      )}
      {tab === 4 && (
        <SimplePanel
          title="Create official"
          fields={['fullName', 'email', 'officialType']}
          endpoint="official"
        />
      )}
      {tab === 5 && <CsvImportPanel />}
    </PageScaffold>
  );
}

function TeamFormPanel() {
  const api = useApi();
  const client = useQueryClient();
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const teams = useQuery({
    queryKey: ['teams', 'admin-list'],
    queryFn: () => api.getTeams(new URLSearchParams({ per_page: '50', include_archived: '1' })),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [logo, setLogo] = useState<MediaUpload | null>(null);
  const form = useForm<TeamForm>({ defaultValues: { name: '', sportUuid: '', shortName: '' } });
  const mutation = useMutation({
    mutationFn: (values: TeamForm) =>
      editing
        ? api.updateAdminEntity('teams', editing.uuid, { ...values, ...(logo ? { logo } : {}) })
        : api.createTeam({ ...values, logo }),
    onSuccess: () => {
      form.reset();
      setLogo(null);
      setOpen(false);
      setEditing(null);
      void client.invalidateQueries({ queryKey: ['teams'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'archive' | 'restore' }) =>
      api.changeAdminEntityStatus('teams', uuid, action),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['teams'] }),
  });
  if (sports.isLoading) return <LoadingState label="Loading sports" />;
  return (
    <Stack spacing={2}>
      <ListHeader
        title="Teams"
        count={teams.data?.total ?? 0}
        action="Create team"
        onClick={() => {
          setEditing(null);
          form.reset();
          setLogo(null);
          setOpen(true);
        }}
      />
      {(teams.data?.items ?? []).map((team) => (
        <Paper key={team.uuid} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EntityAvatar
              entity="team"
              src={team.logoUrl}
              alt={`${team.name} logo`}
              sx={{ width: 52, height: 52 }}
            />
            <Stack flex={1}>
              <Typography fontWeight={850}>{team.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {team.sport.name} · {team.status}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditing(team);
                  form.reset({
                    name: team.name,
                    shortName: team.shortName,
                    sportUuid: team.sport.uuid,
                  });
                  setLogo(null);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                color={team.status === 'archived' ? 'success' : 'error'}
                onClick={() =>
                  statusMutation.mutate({
                    uuid: team.uuid,
                    action: team.status === 'archived' ? 'restore' : 'archive',
                  })
                }
              >
                {team.status === 'archived' ? 'Restore' : 'Archive'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      {teams.data?.items.length === 0 && (
        <Alert severity="info">No teams have been created yet.</Alert>
      )}
      <CreateDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit team' : 'Create team'}
      >
        <Stack
          component="form"
          spacing={2}
          onSubmit={(event) => void form.handleSubmit((values) => mutation.mutate(values))(event)}
        >
          <TextField required label="Team name" {...form.register('name')} />
          <TextField label="Short name" {...form.register('shortName')} />
          <Controller
            name="sportUuid"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} required select label="Sport">
                {(sports.data ?? []).map((sport) => (
                  <MenuItem key={sport.uuid} value={sport.uuid}>
                    {sport.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <MediaUploadField entity="team" label="Team logo" value={logo} onChange={setLogo} />
          <MutationState mutation={mutation} success="Team created and audited." />
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {editing ? 'Save changes' : 'Create team'}
          </Button>
        </Stack>
      </CreateDialog>
    </Stack>
  );
}

function PlayerFormPanel() {
  const api = useApi();
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const teams = useQuery({
    queryKey: ['teams', 'admin-player-filters'],
    queryFn: () => api.getTeams(new URLSearchParams({ per_page: '50' })),
  });
  const competitions = useQuery({
    queryKey: ['competitions', 'admin-player-form'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });
  const cfflSummary = competitions.data?.items.find(
    (competition) =>
      competition.slug === 'cffl-lagos' || competition.name.toLowerCase() === 'cffl lagos',
  );
  const cfflCompetition = useQuery({
    queryKey: ['competition', 'cffl-lagos', cfflSummary?.uuid],
    queryFn: () => api.getCompetition(cfflSummary?.uuid ?? ''),
    enabled: Boolean(cfflSummary?.uuid),
  });
  const defaultSeasonUuid = String(cfflCompetition.data?.rules.default_season_uuid ?? '');
  const defaultSeason = cfflCompetition.data?.seasons?.find(
    (season) => season.uuid === defaultSeasonUuid,
  );
  const [search, setSearch] = useState('');
  const [sport, setSport] = useState('');
  const [team, setTeam] = useState('');
  const [position, setPosition] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());
  const playerParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: '24',
      include_archived: '1',
    });
    if (deferredSearch) params.set('search', deferredSearch);
    if (sport) params.set('sport', sport);
    if (team) params.set('team', team);
    if (position) params.set('position', position);
    if (eligibility) params.set('eligibility', eligibility);
    return params;
  }, [deferredSearch, eligibility, page, position, sport, team]);
  const players = useQuery({
    queryKey: ['players', 'admin-list', playerParams.toString()],
    queryFn: () => api.getPlayers(playerParams),
  });
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [photo, setPhoto] = useState<MediaUpload | null>(null);
  const form = useForm<PlayerForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      sportUuid: '',
      primaryPosition: '',
      eligibilityStatus: 'eligible',
      dateOfBirth: '',
      nationality: 'NG',
      competitionUuid: '',
      teamUuid: '',
      seasonUuid: '',
      jerseyNumber: '',
    },
  });
  const mutation = useMutation({
    mutationFn: async (values: PlayerForm) => {
      const playerInput = {
        firstName: values.firstName,
        lastName: values.lastName,
        sportUuid: values.sportUuid,
        primaryPosition: values.primaryPosition,
        eligibilityStatus: values.eligibilityStatus,
        dateOfBirth: values.dateOfBirth,
        nationality: values.nationality,
        ...(photo ? { photo } : editing ? {} : { photo: null }),
      };
      const player = editing
        ? (await api.updateAdminEntity('players', editing.uuid, playerInput), editing)
        : await api.createPlayer(playerInput);
      if (values.teamUuid && values.seasonUuid) {
        const registration = {
          playerUuid: player.uuid,
          teamUuid: values.teamUuid,
          seasonUuid: values.seasonUuid,
          jerseyNumber: values.jerseyNumber === '' ? '' : Number(values.jerseyNumber),
          positionCode: values.primaryPosition,
          eligibilityStatus: values.eligibilityStatus,
          notes: '',
        };
        if (editing?.currentRegistration) {
          await api.updateRegistration(editing.currentRegistration.uuid, registration);
        } else {
          await api.createRegistration(registration);
        }
      }
      return player;
    },
    onSuccess: () => {
      form.reset();
      setPhoto(null);
      setOpen(false);
      setEditing(null);
      void client.invalidateQueries({ queryKey: ['players'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'archive' | 'restore' }) =>
      api.changeAdminEntityStatus('players', uuid, action),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['players'] }),
  });
  const exportMutation = useMutation({
    mutationFn: async () => {
      const base = new URLSearchParams(playerParams);
      base.set('per_page', '50');
      base.set('page', '1');
      const first = await api.getPlayers(base);
      const all = [...first.items];
      for (let exportPage = 2; exportPage <= first.totalPages; exportPage += 1) {
        base.set('page', String(exportPage));
        all.push(...(await api.getPlayers(base)).items);
      }
      downloadCsv(`instascore-players-${new Date().toISOString().slice(0, 10)}.csv`, [
        [
          'firstName',
          'lastName',
          'displayName',
          'nationality',
          'sportUuid',
          'sport',
          'teamUuid',
          'team',
          'seasonUuid',
          'season',
          'jerseyNumber',
          'positionCode',
          'eligibilityStatus',
          'status',
        ],
        ...all.map((player) => [
          player.firstName,
          player.lastName,
          player.displayName,
          player.nationality ?? '',
          player.sport.uuid,
          player.sport.name,
          player.currentRegistration?.team.uuid ?? '',
          player.currentRegistration?.team.name ?? '',
          player.currentRegistration?.season.uuid ?? '',
          player.currentRegistration?.season.name ?? '',
          player.currentRegistration?.jerseyNumber ?? '',
          player.currentRegistration?.positionCode || player.primaryPosition,
          player.eligibilityStatus,
          player.status,
        ]),
      ]);
      return all.length;
    },
  });
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const rows = parseCsv(await file.text());
      let created = 0;
      for (const row of rows) {
        const teamRecord = (teams.data?.items ?? []).find(
          (item) =>
            item.uuid === csvValue(row.teamUuid) ||
            item.name.toLowerCase() === csvValue(row.team || row.teamName).toLowerCase(),
        );
        const teamUuid = csvValue(row.teamUuid) || teamRecord?.uuid || '';
        const sportUuid = csvValue(row.sportUuid) || teamRecord?.sport.uuid || '';
        const seasonUuid = csvValue(row.seasonUuid) || defaultSeasonUuid;
        if (!teamUuid || !sportUuid || !seasonUuid || !row.firstName || !row.lastName) {
          throw new Error(
            `Row ${created + 2} needs firstName, lastName and teamUuid/team. CFFL Lagos must also have a default season.`,
          );
        }
        const player = await api.createPlayer({
          firstName: csvValue(row.firstName),
          lastName: csvValue(row.lastName),
          sportUuid,
          primaryPosition: csvValue(row.positionCode || row.primaryPosition),
          eligibilityStatus: csvValue(row.eligibilityStatus) || 'eligible',
          dateOfBirth: csvValue(row.dateOfBirth),
          nationality: csvValue(row.nationality) || 'NG',
          photo: null,
        });
        await api.createRegistration({
          playerUuid: player.uuid,
          teamUuid,
          seasonUuid,
          jerseyNumber:
            row.jerseyNumber === '' || row.jerseyNumber == null ? '' : Number(row.jerseyNumber),
          positionCode: csvValue(row.positionCode || row.primaryPosition),
          eligibilityStatus: csvValue(row.eligibilityStatus) || 'eligible',
          notes: csvValue(row.notes) || 'CSV player import',
        });
        created += 1;
      }
      return created;
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['players'] }),
  });
  if (sports.isLoading) return <LoadingState label="Loading sports" />;
  return (
    <Stack spacing={2}>
      <ListHeader
        title="Players"
        count={players.data?.total ?? 0}
        action="Create player"
        onClick={() => {
          setEditing(null);
          form.reset({
            firstName: '',
            lastName: '',
            sportUuid: cfflSummary?.sport.uuid ?? '',
            primaryPosition: '',
            eligibilityStatus: 'eligible',
            dateOfBirth: '',
            nationality: 'NG',
            competitionUuid: cfflSummary?.uuid ?? '',
            teamUuid: '',
            seasonUuid: defaultSeasonUuid,
            jerseyNumber: '',
          });
          setPhoto(null);
          setOpen(true);
        }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="outlined"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? 'Preparing CSV…' : 'Export filtered players'}
        </Button>
        <Button component="label" variant="outlined" disabled={importMutation.isPending}>
          {importMutation.isPending ? 'Importing…' : 'Import player CSV'}
          <input
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importMutation.mutate(file);
              event.target.value = '';
            }}
          />
        </Button>
        <Button
          variant="text"
          onClick={() =>
            downloadCsv('instascore-player-import-template.csv', [
              [
                'firstName',
                'lastName',
                'nationality',
                'teamUuid',
                'jerseyNumber',
                'positionCode',
                'eligibilityStatus',
                'dateOfBirth',
                'notes',
              ],
            ])
          }
        >
          Download import template
        </Button>
      </Stack>
      {exportMutation.isSuccess && (
        <Alert severity="success">Exported {exportMutation.data} player records.</Alert>
      )}
      {importMutation.isSuccess && (
        <Alert severity="success">
          Imported {importMutation.data} players with team registrations.
        </Alert>
      )}
      {importMutation.isError && (
        <Alert severity="error">
          {importMutation.error instanceof Error
            ? importMutation.error.message
            : 'The player CSV could not be imported.'}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            label="Search players"
            placeholder="Name, team or jersey number"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <TextField
            select
            label="Sport"
            value={sport}
            onChange={(event) => {
              setSport(event.target.value);
              setTeam('');
              setPosition('');
              setPage(1);
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All sports</MenuItem>
            {(sports.data ?? []).map((item) => (
              <MenuItem key={item.uuid} value={item.slug}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Team"
            value={team}
            onChange={(event) => {
              setTeam(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">All teams</MenuItem>
            {(teams.data?.items ?? [])
              .filter((item) => !sport || item.sport.slug === sport)
              .map((item) => (
                <MenuItem key={item.uuid} value={item.uuid}>
                  {item.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            label="Position"
            value={position}
            onChange={(event) => {
              setPosition(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All positions</MenuItem>
            {Array.from(
              new Map(
                Object.values(positions)
                  .flat()
                  .map(([code, label]) => [code, label]),
              ),
            ).map(([code, label]) => (
              <MenuItem key={code} value={code}>
                {label} ({code})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Eligibility"
            value={eligibility}
            onChange={(event) => {
              setEligibility(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 175 }}
          >
            <MenuItem value="">Any status</MenuItem>
            {eligibilityOptions.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>
      {(players.data?.items ?? []).map((player) => (
        <Paper key={player.uuid} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EntityAvatar
              entity="player"
              src={player.photoUrl}
              alt={`${player.displayName} profile`}
              sx={{ width: 52, height: 52 }}
            />
            <Stack flex={1}>
              <Typography fontWeight={850}>{player.displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {player.currentRegistration?.team.name ?? 'Unassigned team'}
                {player.currentRegistration?.jerseyNumber != null
                  ? ` · #${player.currentRegistration.jerseyNumber}`
                  : ''}{' '}
                · {player.sport.name} ·{' '}
                {player.currentRegistration?.positionCode ||
                  player.primaryPosition ||
                  'Position pending'}{' '}
                · {player.eligibilityStatus} · {player.nationality || 'Nationality pending'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditing(player);
                  form.reset({
                    firstName: player.firstName,
                    lastName: player.lastName,
                    sportUuid: cfflSummary?.sport.uuid ?? player.sport.uuid,
                    primaryPosition: player.primaryPosition,
                    eligibilityStatus: player.eligibilityStatus,
                    dateOfBirth: player.dateOfBirth ?? '',
                    nationality: player.nationality ?? 'NG',
                    competitionUuid: cfflSummary?.uuid ?? '',
                    teamUuid: player.currentRegistration?.team.uuid ?? '',
                    seasonUuid: defaultSeasonUuid,
                    jerseyNumber:
                      player.currentRegistration?.jerseyNumber == null
                        ? ''
                        : String(player.currentRegistration.jerseyNumber),
                  });
                  setPhoto(null);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                color={player.status === 'archived' ? 'success' : 'error'}
                onClick={() =>
                  statusMutation.mutate({
                    uuid: player.uuid,
                    action: player.status === 'archived' ? 'restore' : 'archive',
                  })
                }
              >
                {player.status === 'archived' ? 'Restore' : 'Archive'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      {players.data?.items.length === 0 && (
        <Alert severity="info">No players match the current search and filters.</Alert>
      )}
      {(players.data?.totalPages ?? 0) > 1 && (
        <Pagination
          count={players.data?.totalPages ?? 1}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
          sx={{ alignSelf: 'center' }}
        />
      )}
      <CreateDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit player' : 'Create player'}
      >
        <Stack
          component="form"
          spacing={2}
          onSubmit={(event) => void form.handleSubmit((values) => mutation.mutate(values))(event)}
        >
          <TextField required label="First name" {...form.register('firstName')} />
          <TextField required label="Last name" {...form.register('lastName')} />
          <TextField
            label="Date of birth"
            type="date"
            InputLabelProps={{ shrink: true }}
            {...form.register('dateOfBirth')}
          />
          <Controller
            name="nationality"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} select label="Nationality">
                {countries.map(([code, name]) => (
                  <MenuItem key={code} value={code}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="eligibilityStatus"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} select label="Eligibility">
                {eligibilityOptions.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="primaryPosition"
            control={form.control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Primary position"
                disabled={!form.watch('sportUuid')}
              >
                {sportPositions(sports.data, form.watch('sportUuid')).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <MediaUploadField
            entity="player"
            label="Player photo"
            value={photo}
            onChange={setPhoto}
            round
          />
          <TextField
            label="Competition"
            value="CFFL Lagos"
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            label="Default season"
            value={defaultSeason?.name ?? 'No default season configured'}
            error={!defaultSeasonUuid}
            helperText={
              defaultSeasonUuid
                ? 'Managed from Admin → Competitions → Seasons.'
                : 'Set the CFFL Lagos default season before saving players.'
            }
            slotProps={{ input: { readOnly: true } }}
          />
          <Controller
            name="teamUuid"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} select required label="Team">
                {(teams.data?.items ?? [])
                  .filter(
                    (team) =>
                      !form.watch('sportUuid') || team.sport.uuid === form.watch('sportUuid'),
                  )
                  .map((team) => (
                    <MenuItem key={team.uuid} value={team.uuid}>
                      {team.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
          />
          <TextField label="Jersey number" type="number" {...form.register('jerseyNumber')} />
          <MutationState mutation={mutation} success="Player created and audited." />
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending || !cfflSummary || !defaultSeasonUuid}
          >
            {editing ? 'Save changes' : 'Create player'}
          </Button>
        </Stack>
      </CreateDialog>
    </Stack>
  );
}

function RegistrationPanel() {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [competitionUuid, setCompetitionUuid] = useState('');
  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(new URLSearchParams({ per_page: '50' })),
  });
  const players = useQuery({
    queryKey: ['players'],
    queryFn: () => api.getPlayers(new URLSearchParams({ per_page: '50' })),
  });
  const competitions = useQuery({
    queryKey: ['registration', 'competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });
  const competition = useQuery({
    queryKey: ['registration', 'competition', competitionUuid],
    queryFn: () => api.getCompetition(competitionUuid),
    enabled: Boolean(competitionUuid),
  });
  const form = useForm<RegistrationForm>({
    defaultValues: {
      teamUuid: '',
      playerUuid: '',
      seasonUuid: '',
      jerseyNumber: '',
      positionCode: '',
      eligibilityStatus: 'eligible',
    },
  });
  const selectedPlayer = players.data?.items.find(
    (player) => player.uuid === form.watch('playerUuid'),
  );
  const mutation = useMutation({
    mutationFn: (values: RegistrationForm) =>
      api.createRegistration({
        ...values,
        jerseyNumber: values.jerseyNumber === '' ? '' : Number(values.jerseyNumber),
      }),
    onSuccess: () => {
      form.reset();
      setOpen(false);
    },
  });
  return (
    <Stack spacing={2}>
      <ListHeader
        title="Player registrations"
        count={players.data?.total ?? 0}
        action="Add registration"
        onClick={() => setOpen(true)}
      />
      <Alert severity="info">
        Select a player from the Players list to review their complete registration history.
      </Alert>
      <CreateDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Register player to team and season"
      >
        <Stack
          component="form"
          spacing={2}
          onSubmit={(event) => void form.handleSubmit((values) => mutation.mutate(values))(event)}
        >
          <TextField
            select
            required
            label="Competition"
            value={competitionUuid}
            onChange={(event) => {
              setCompetitionUuid(event.target.value);
              form.setValue('seasonUuid', '');
              form.setValue('teamUuid', '');
              form.setValue('playerUuid', '');
              form.setValue('positionCode', '');
            }}
          >
            {(competitions.data?.items ?? []).map((item) => (
              <MenuItem key={item.uuid} value={item.uuid}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <SelectField
            name="teamUuid"
            label="Team"
            control={form.control}
            items={(teams.data?.items ?? []).filter(
              (team) => !competition.data || team.sport.uuid === competition.data.sport.uuid,
            )}
          />
          <SelectField
            name="playerUuid"
            label="Player"
            control={form.control}
            items={
              players.data?.items
                .filter(
                  (player) =>
                    !competition.data || player.sport.uuid === competition.data.sport.uuid,
                )
                .map((player) => ({ uuid: player.uuid, name: player.displayName })) ?? []
            }
          />
          <Controller
            name="seasonUuid"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} required select label="Season" disabled={!competitionUuid}>
                {(competition.data?.seasons ?? []).map((season) => (
                  <MenuItem key={season.uuid} value={season.uuid}>
                    {season.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField label="Jersey number" type="number" {...form.register('jerseyNumber')} />
          <Controller
            name="positionCode"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} select label="Squad position" disabled={!selectedPlayer}>
                {sportPositions(
                  selectedPlayer ? [selectedPlayer.sport] : undefined,
                  selectedPlayer?.sport.uuid ?? '',
                ).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="eligibilityStatus"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} select label="Registration eligibility">
                {eligibilityOptions.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <MutationState mutation={mutation} success="Registration saved with history." />
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            Register player
          </Button>
        </Stack>
      </CreateDialog>
    </Stack>
  );
}

function SelectField({
  name,
  label,
  control,
  items,
}: {
  name: keyof RegistrationForm;
  label: string;
  control: ReturnType<typeof useForm<RegistrationForm>>['control'];
  items: { uuid: string; name: string }[];
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField {...field} required select label={label}>
          {items.map((item) => (
            <MenuItem key={item.uuid} value={item.uuid}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

function SimplePanel({
  title,
  fields,
  endpoint,
}: {
  title: string;
  fields: string[];
  endpoint: 'venue' | 'official';
}) {
  const api = useApi();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const directory = useQuery<Array<Venue | Official>>({
    queryKey: ['admin', endpoint === 'venue' ? 'venues' : 'officials'],
    queryFn: () => (endpoint === 'venue' ? api.getVenues() : api.getOfficials()),
  });
  const mutation = useMutation({
    mutationFn: () =>
      editingUuid
        ? api.updateAdminEntity(endpoint === 'venue' ? 'venues' : 'officials', editingUuid, values)
        : endpoint === 'venue'
          ? api.createVenue(values)
          : api.createOfficial(values),
    onSuccess: () => {
      setValues({});
      setOpen(false);
      setEditingUuid(null);
      void client.invalidateQueries({
        queryKey: ['admin', endpoint === 'venue' ? 'venues' : 'officials'],
      });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'archive' | 'restore' }) =>
      api.changeAdminEntityStatus(endpoint === 'venue' ? 'venues' : 'officials', uuid, action),
    onSuccess: () =>
      void client.invalidateQueries({
        queryKey: ['admin', endpoint === 'venue' ? 'venues' : 'officials'],
      }),
  });
  return (
    <Stack spacing={2}>
      <ListHeader
        title={title.replace('Create ', '') + 's'}
        count={directory.data?.length ?? 0}
        action={title}
        onClick={() => {
          setEditingUuid(null);
          setValues({});
          setOpen(true);
        }}
      />
      {(directory.data ?? []).map((record) => (
        <Paper key={record.uuid} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <div>
              <Typography fontWeight={850}>{record.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {'city' in record
                  ? `${record.city || 'City pending'} · ${record.countryCode || 'Country pending'}`
                  : `${record.officialType.replace('_', ' ')} · ${record.email || 'No email'}`}
              </Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingUuid(record.uuid);
                  setValues(
                    'city' in record
                      ? { name: record.name, city: record.city, countryCode: record.countryCode }
                      : {
                          fullName: record.name,
                          email: record.email,
                          officialType: record.officialType,
                          countryCode: record.countryCode,
                        },
                  );
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                color={record.status === 'archived' ? 'success' : 'error'}
                onClick={() =>
                  statusMutation.mutate({
                    uuid: record.uuid,
                    action: record.status === 'archived' ? 'restore' : 'archive',
                  })
                }
              >
                {record.status === 'archived' ? 'Restore' : 'Archive'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
      {directory.data?.length === 0 && (
        <Alert severity="info">
          No {title.replace('Create ', '').toLowerCase()} records have been created yet.
        </Alert>
      )}
      <CreateDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editingUuid ? title.replace('Create', 'Edit') : title}
      >
        <Stack
          component="form"
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {fields.map((field) => (
            <TextField
              key={field}
              select={field === 'countryCode' || field === 'officialType'}
              required={field === 'name' || field === 'fullName'}
              label={field}
              value={values[field] ?? ''}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field]: event.target.value }))
              }
            >
              {field === 'countryCode' &&
                countries.map(([code, name]) => (
                  <MenuItem key={code} value={code}>
                    {name}
                  </MenuItem>
                ))}
              {field === 'officialType' &&
                [
                  ['referee', 'Referee'],
                  ['umpire', 'Umpire'],
                  ['table_official', 'Table official'],
                  ['commissioner', 'Commissioner'],
                ].map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
            </TextField>
          ))}
          <MutationState
            mutation={mutation}
            success={`${title.replace('Create ', '')} created and audited.`}
          />
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {editingUuid ? 'Save changes' : 'Create'}
          </Button>
        </Stack>
      </CreateDialog>
    </Stack>
  );
}

function ListHeader({
  title,
  count,
  action,
  onClick,
}: {
  title: string;
  count: number;
  action: string;
  onClick: () => void;
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
      <div>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary">{count} records</Typography>
      </div>
      <Button variant="contained" onClick={onClick}>
        {action}
      </Button>
    </Stack>
  );
}

function CreateDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>{children}</DialogContent>
    </Dialog>
  );
}

function CsvImportPanel() {
  const api = useApi();
  const [csv, setCsv] = useState(
    'teamUuid,playerUuid,seasonUuid,jerseyNumber,positionCode,eligibilityStatus,notes',
  );
  const rows = () => parseCsv(csv);
  const preview = useMutation({ mutationFn: () => api.previewRegistrationImport(rows()) });
  const commit = useMutation({ mutationFn: () => api.commitRegistrationImport(rows()) });
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Registration CSV import</Typography>
      <TextField
        label="CSV rows"
        multiline
        minRows={7}
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={() => preview.mutate()} disabled={preview.isPending}>
          Dry-run preview
        </Button>
        <Button
          variant="contained"
          onClick={() => commit.mutate()}
          disabled={commit.isPending || preview.data?.errors.length !== 0}
        >
          Commit valid rows
        </Button>
      </Stack>
      {preview.data && (
        <Alert severity={preview.data.errors.length ? 'warning' : 'success'}>
          {preview.data.valid} valid rows, {preview.data.errors.length} errors.
        </Alert>
      )}
      <MutationState mutation={commit} success="CSV import committed transactionally." />
    </Stack>
  );
}

function MutationState({
  mutation,
  success,
}: {
  mutation: { isError: boolean; isSuccess: boolean; error: unknown };
  success: string;
}) {
  if (mutation.isError) {
    return (
      <Alert severity="error">
        {mutation.error instanceof ApiError
          ? mutation.error.message
          : 'The change could not be saved.'}
      </Alert>
    );
  }
  if (mutation.isSuccess) return <Alert severity="success">{success}</Alert>;
  return null;
}

function parseCsv(csv: string): Record<string, unknown>[] {
  const [headerLine = '', ...lines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const rows: Record<string, unknown>[] = [];
  for (const line of lines.filter(Boolean)) {
    const row: Record<string, unknown> = {};
    parseCsvLine(line).forEach((value, index) => {
      const header = headers[index];
      if (header) {
        row[header] = value;
      }
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function csvValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
