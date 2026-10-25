import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { MediaUploadField } from '../../components/MediaUploadField';
import { PageScaffold } from '../../components/PageScaffold';
import type { Fixture, FixtureStreamInput, MediaUpload } from '../../types/api';
import { fixtureTitle, formatKickoff } from './fixtureFormat';

const emptyForm = {
  sponsorName: '',
  campaignName: '',
  destinationUrl: '',
  placement: 'pre_match',
  competitionUuid: '',
  fixtureUuid: '',
  startsAt: '',
  endsAt: '',
};

const emptyStream: FixtureStreamInput = {
  youtubeUrl: '',
  title: '',
  status: 'scheduled',
  visibility: 'unlisted',
  embedEnabled: true,
  chatEnabled: false,
  featured: false,
};

export function StreamAnalyticsAdminPage() {
  const api = useApi();
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [logo, setLogo] = useState<MediaUpload | null>(null);
  const [fixtureSearch, setFixtureSearch] = useState('');
  const [fixtureCompetition, setFixtureCompetition] = useState('');
  const [streamFixture, setStreamFixture] = useState<Fixture | null>(null);
  const [streamForm, setStreamForm] = useState<FixtureStreamInput>(emptyStream);
  const report = useQuery({ queryKey: ['stream-analytics'], queryFn: api.getStreamAnalytics });
  const competitions = useQuery({
    queryKey: ['stream-sponsor-competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '100' })),
  });
  const fixtures = useQuery({
    queryKey: ['stream-fixtures', fixtureCompetition, fixtureSearch],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: '100' });
      if (fixtureCompetition) params.set('competition', fixtureCompetition);
      if (fixtureSearch.trim()) params.set('search', fixtureSearch.trim());
      return api.getAdminFixtures(params);
    },
  });
  const existingStream = useQuery({
    queryKey: ['admin-fixture-broadcast', streamFixture?.uuid],
    queryFn: () => api.getAdminFixtureStream(streamFixture?.uuid ?? ''),
    enabled: Boolean(streamFixture),
  });
  const openStream = (fixture: Fixture) => {
    setStreamFixture(fixture);
    setStreamForm({ ...emptyStream, title: fixtureTitle(fixture) });
  };
  useEffect(() => {
    if (!streamFixture || existingStream.isLoading) return;
    if (!existingStream.data) return;
    setStreamForm({
      youtubeUrl: existingStream.data.watchUrl,
      title: existingStream.data.title,
      status: existingStream.data.status,
      visibility: existingStream.data.visibility,
      embedEnabled: existingStream.data.embedEnabled,
      chatEnabled: existingStream.data.chatEnabled,
      featured: existingStream.data.featured,
      ...(existingStream.data.scheduledStart
        ? { scheduledStart: existingStream.data.scheduledStart }
        : {}),
    });
  }, [existingStream.data, existingStream.isLoading, streamFixture]);
  const saveStream = useMutation({
    mutationFn: () => api.saveFixtureStream(streamFixture?.uuid ?? '', streamForm),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-fixture-broadcast'] });
      setStreamFixture(null);
    },
  });
  const disableStream = useMutation({
    mutationFn: () => api.disableFixtureStream(streamFixture?.uuid ?? ''),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-fixture-broadcast'] });
      setStreamFixture(null);
    },
  });
  const visibleFixtures = (fixtures.data?.items ?? []).filter((fixture) => {
    return !fixtureCompetition || fixture.competition.uuid === fixtureCompetition;
  });
  const create = useMutation({
    mutationFn: () => api.createStreamSponsor({ ...form, logoUrl: logo?.url ?? '' }),
    onSuccess: () => {
      setForm(emptyForm);
      setLogo(null);
      void client.invalidateQueries({ queryKey: ['stream-analytics'] });
    },
  });
  const updateSponsor = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: 'active' | 'paused' | 'archived' }) =>
      api.updateStreamSponsor(uuid, { status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['stream-analytics'] }),
  });
  const summary = report.data?.summary;

  return (
    <PageScaffold
      eyebrow="Livestream business"
      title="Livestreams, analytics & sponsors"
      description="Attach match broadcasts with a simple YouTube URL, then measure viewing and manage sponsor placements."
      status={`${summary?.sessions ?? 0} sessions`}
    >
      {report.isLoading ? <LoadingState label="Loading livestream report" /> : null}
      {report.isError ? (
        <ErrorState description="Livestream analytics could not be loaded." />
      ) : null}
      <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={950}>
              Match livestreams
            </Typography>
            <Typography color="text.secondary">
              Select any fixture and paste its public YouTube URL. API connection is not required.
            </Typography>
          </Box>
          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 7 }}>
              <TextField
                fullWidth
                label="Find a fixture"
                value={fixtureSearch}
                onChange={(event) => setFixtureSearch(event.target.value)}
                placeholder="Search team, competition or round"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                select
                fullWidth
                label="Competition"
                value={fixtureCompetition}
                onChange={(event) => setFixtureCompetition(event.target.value)}
              >
                <MenuItem value="">All competitions</MenuItem>
                {(competitions.data?.items ?? []).map((competition) => (
                  <MenuItem key={competition.uuid} value={competition.uuid}>
                    {competition.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          {fixtures.isLoading ? <LoadingState label="Loading fixtures" /> : null}
          <Stack spacing={1} sx={{ maxHeight: 440, overflowY: 'auto' }}>
            {visibleFixtures.map((fixture) => (
              <Paper key={fixture.uuid} variant="outlined" sx={{ p: 1.5 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  gap={1}
                >
                  <Box>
                    <Typography fontWeight={950}>{fixtureTitle(fixture)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {fixture.competition.name} · {fixture.roundName || 'Fixture'} ·{' '}
                      {formatKickoff(fixture)}
                    </Typography>
                  </Box>
                  <Button variant="contained" size="small" onClick={() => openStream(fixture)}>
                    Add URL
                  </Button>
                </Stack>
              </Paper>
            ))}
            {!fixtures.isLoading && !visibleFixtures.length ? (
              <Alert severity="info">No fixtures match these filters.</Alert>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
      {report.data ? (
        <Stack spacing={2.5}>
          <Grid container spacing={1.25}>
            {[
              ['Viewing sessions', summary?.sessions ?? 0],
              ['Streamed fixtures', summary?.fixtures ?? 0],
              ['Total watch time', duration(summary?.watchSeconds ?? 0)],
              ['Average session', duration(summary?.averageWatchSeconds ?? 0)],
            ].map(([label, value]) => (
              <Grid key={label} size={{ xs: 6, md: 3 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h5" fontWeight={950}>
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
              <Box>
                <Typography variant="h5" fontWeight={950}>
                  Fixture viewing performance
                </Typography>
                <Typography color="text.secondary">
                  Privacy-safe sessions and watch time by broadcast.
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => exportReport(report.data)}>
                Export CSV
              </Button>
            </Stack>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {report.data.fixtures.map((item) => (
                <Stack
                  key={item.fixtureUuid}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  gap={1}
                  sx={{ borderBottom: 1, borderColor: 'divider', py: 1 }}
                >
                  <Typography fontWeight={900}>{item.fixtureName}</Typography>
                  <Typography color="text.secondary">
                    {item.sessions} sessions · {duration(item.watchSeconds)} watched ·{' '}
                    {duration(item.averageWatchSeconds)} avg
                  </Typography>
                </Stack>
              ))}
              {!report.data.fixtures.length ? (
                <Typography color="text.secondary">
                  Fixture analytics appear after the first viewer session.
                </Typography>
              ) : null}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={950}>
              Campaign outcomes
            </Typography>
            <Grid container spacing={1.25} sx={{ mt: 0.5 }}>
              {report.data.campaigns.map((item) => (
                <Grid key={item.campaignName} size={{ xs: 12, md: 4 }}>
                  <Box sx={{ borderLeft: 3, borderColor: 'secondary.main', pl: 1.5 }}>
                    <Typography fontWeight={900}>{item.campaignName}</Typography>
                    <Typography color="text.secondary">
                      {item.impressions} impressions · {item.clicks} clicks ·{' '}
                      {item.clickThroughRate}% CTR
                    </Typography>
                  </Box>
                </Grid>
              ))}
              {!report.data.campaigns.length ? (
                <Grid size={12}>
                  <Typography color="text.secondary">No campaign measurements yet.</Typography>
                </Grid>
              ) : null}
            </Grid>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={950}>
              Device breakdown
            </Typography>
            <Grid container spacing={1.25} sx={{ mt: 0.5 }}>
              {report.data.devices.map((item) => (
                <Grid key={item.device} size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 1.5 }}>
                    <Typography fontWeight={900} sx={{ textTransform: 'capitalize' }}>
                      {item.device}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.sessions} sessions · {duration(item.watchSeconds)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
              {!report.data.devices.length ? (
                <Grid size={12}>
                  <Typography color="text.secondary">
                    Device data appears after viewers start watching.
                  </Typography>
                </Grid>
              ) : null}
            </Grid>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={950}>
              Create sponsor placement
            </Typography>
            <Typography color="text.secondary">
              Fixture placement overrides competition placement; an empty scope applies
              platform-wide.
            </Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Sponsor name"
                  value={form.sponsorName}
                  onChange={(e) => setForm({ ...form, sponsorName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Campaign name"
                  value={form.campaignName}
                  onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Placement"
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value })}
                >
                  {['pre_match', 'in_player', 'post_match'].map((value) => (
                    <MenuItem key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Competition scope"
                  value={form.competitionUuid}
                  onChange={(e) =>
                    setForm({ ...form, competitionUuid: e.target.value, fixtureUuid: '' })
                  }
                >
                  <MenuItem value="">All competitions</MenuItem>
                  {(competitions.data?.items ?? []).map((item) => (
                    <MenuItem key={item.uuid} value={item.uuid}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Fixture override"
                  value={form.fixtureUuid}
                  onChange={(e) => setForm({ ...form, fixtureUuid: e.target.value })}
                >
                  <MenuItem value="">No fixture override</MenuItem>
                  {(fixtures.data?.items ?? [])
                    .filter(
                      (item) =>
                        !form.competitionUuid || item.competition.uuid === form.competitionUuid,
                    )
                    .map((item) => (
                      <MenuItem key={item.uuid} value={item.uuid}>
                        {item.homeTeam.name} vs {item.awayTeam.name}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Starts"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Ends"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  type="url"
                  label="Sponsor destination URL"
                  value={form.destinationUrl}
                  onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
                />
              </Grid>
              <Grid size={12}>
                <MediaUploadField
                  entity="competition"
                  label="Sponsor logo"
                  value={logo}
                  onChange={setLogo}
                />
              </Grid>
            </Grid>
            {create.isError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                The sponsor placement could not be created.
              </Alert>
            ) : null}
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              disabled={!form.sponsorName.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create placement
            </Button>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={950} gutterBottom>
              Campaign performance
            </Typography>
            <Stack spacing={1}>
              {report.data.sponsors.map((item) => (
                <Box
                  key={item.uuid}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', md: '1.5fr 1fr auto auto auto' },
                    gap: 1,
                    alignItems: 'center',
                    borderBottom: 1,
                    borderColor: 'divider',
                    py: 1,
                  }}
                >
                  <Box>
                    <Typography fontWeight={900}>{item.sponsorName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.campaignName || item.placement.replaceAll('_', ' ')}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{item.placement.replaceAll('_', ' ')}</Typography>
                  <Typography fontWeight={800}>{item.impressions} views</Typography>
                  <Typography fontWeight={800}>{item.clicks} clicks</Typography>
                  <Stack direction="row" gap={0.5}>
                    <Button
                      size="small"
                      disabled={updateSponsor.isPending}
                      onClick={() =>
                        updateSponsor.mutate({
                          uuid: item.uuid,
                          status: item.status === 'paused' ? 'active' : 'paused',
                        })
                      }
                    >
                      {item.status === 'paused' ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={item.status === 'archived' || updateSponsor.isPending}
                      onClick={() => updateSponsor.mutate({ uuid: item.uuid, status: 'archived' })}
                    >
                      Archive
                    </Button>
                  </Stack>
                </Box>
              ))}
              {!report.data.sponsors.length ? (
                <Typography color="text.secondary">No sponsor placements yet.</Typography>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      ) : null}
      <Dialog
        open={Boolean(streamFixture)}
        onClose={() => setStreamFixture(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Add livestream · {streamFixture ? fixtureTitle(streamFixture) : ''}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Paste the public YouTube link. No API connection is required.
            </Alert>
            <TextField
              autoFocus
              required
              fullWidth
              label="YouTube livestream URL"
              placeholder="https://www.youtube.com/watch?v=..."
              value={streamForm.youtubeUrl}
              onChange={(event) =>
                setStreamForm((current) => ({ ...current, youtubeUrl: event.target.value }))
              }
              helperText="YouTube watch, live, youtu.be, Shorts and embed links are supported."
            />
            <TextField
              fullWidth
              label="Title (optional)"
              value={streamForm.title}
              onChange={(event) =>
                setStreamForm((current) => ({ ...current, title: event.target.value }))
              }
            />
            {existingStream.data ? (
              <Alert severity="success">
                A livestream is already attached. Saving replaces its URL.
              </Alert>
            ) : null}
            {saveStream.isError ? (
              <Alert severity="error">
                Use a valid public YouTube link or 11-character video ID.
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            color="error"
            disabled={!existingStream.data || disableStream.isPending}
            onClick={() => disableStream.mutate()}
          >
            Remove stream
          </Button>
          <Stack direction="row" gap={1}>
            <Button onClick={() => setStreamFixture(null)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!streamForm.youtubeUrl.trim() || saveStream.isPending}
              onClick={() => saveStream.mutate()}
            >
              Save livestream
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );
}

function duration(seconds: number) {
  const value = Math.max(0, seconds);
  if (value >= 3600) return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

function exportReport(report: import('../../types/api').StreamAnalyticsReport) {
  const rows = [
    ['Fixture', 'Sessions', 'Watch seconds', 'Average watch seconds'],
    ...report.fixtures.map((item) => [
      item.fixtureName,
      item.sessions,
      item.watchSeconds,
      item.averageWatchSeconds,
    ]),
    [],
    ['Campaign', 'Impressions', 'Clicks', 'CTR percent'],
    ...report.campaigns.map((item) => [
      item.campaignName,
      item.impressions,
      item.clicks,
      item.clickThroughRate,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `instascore-stream-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
