import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { MediaUploadField } from '../../components/MediaUploadField';
import { PageScaffold } from '../../components/PageScaffold';
import type { MediaUpload } from '../../types/api';

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

export function StreamAnalyticsAdminPage() {
  const api = useApi();
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [logo, setLogo] = useState<MediaUpload | null>(null);
  const report = useQuery({ queryKey: ['stream-analytics'], queryFn: api.getStreamAnalytics });
  const competitions = useQuery({
    queryKey: ['stream-sponsor-competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '100' })),
  });
  const fixtures = useQuery({
    queryKey: ['stream-sponsor-fixtures'],
    queryFn: () => api.getAdminFixtures(new URLSearchParams({ per_page: '100' })),
  });
  const create = useMutation({
    mutationFn: () => api.createStreamSponsor({ ...form, logoUrl: logo?.url ?? '' }),
    onSuccess: () => {
      setForm(emptyForm);
      setLogo(null);
      void client.invalidateQueries({ queryKey: ['stream-analytics'] });
    },
  });
  const summary = report.data?.summary;

  return (
    <PageScaffold
      eyebrow="Livestream business"
      title="Streaming analytics & sponsors"
      description="Measure privacy-safe viewing and manage sponsor placements across matches and competitions."
      status={`${summary?.sessions ?? 0} sessions`}
    >
      {report.isLoading ? <LoadingState label="Loading livestream report" /> : null}
      {report.isError ? (
        <ErrorState description="Livestream analytics could not be loaded." />
      ) : null}
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
                    gridTemplateColumns: { xs: '1fr auto', md: '1.5fr 1fr auto auto' },
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
                </Box>
              ))}
              {!report.data.sponsors.length ? (
                <Typography color="text.secondary">No sponsor placements yet.</Typography>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      ) : null}
    </PageScaffold>
  );
}

function duration(seconds: number) {
  const value = Math.max(0, seconds);
  if (value >= 3600) return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}
