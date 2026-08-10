import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { fixtureTitle, formatKickoff, statusLabel } from '../fixtures/fixtureFormat';
import { publicSportName } from '../../utils/publicSportName';

function portalAccent(rules: Record<string, string | number | boolean>) {
  const value = rules.portalAccent;
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#f7c948';
}

export function CompetitionPortalPage() {
  const api = useApi();
  const { competitionUuid = '' } = useParams();
  const competition = useQuery({
    queryKey: ['portal-competition', competitionUuid],
    queryFn: () => api.getCompetition(competitionUuid),
    enabled: Boolean(competitionUuid),
  });
  const fixtures = useQuery({
    queryKey: ['portal-fixtures', competitionUuid],
    queryFn: () =>
      api.getFixtures(new URLSearchParams({ competition: competitionUuid, per_page: '6' })),
    enabled: Boolean(competitionUuid),
  });
  const standings = useQuery({
    queryKey: ['portal-standings', competitionUuid],
    queryFn: () => api.getStandings(competitionUuid),
    enabled: Boolean(competitionUuid),
  });

  if (competition.isLoading) return <LoadingState label="Loading portal" />;
  if (competition.isError || !competition.data) {
    return (
      <ErrorState title="Portal unavailable" description="Competition portal was not found." />
    );
  }

  const accent = portalAccent(competition.data.rules);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#f8f5ec' }}>
      <Box
        sx={{
          bgcolor: '#0c1a2c',
          color: '#fff',
          borderBottom: `6px solid ${accent}`,
          p: { xs: 3, md: 6 },
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 1180, mx: 'auto' }}>
          <EntityAvatar
            entity="competition"
            src={competition.data.logoUrl}
            alt={`${competition.data.name} logo`}
            sx={{ width: 92, height: 92 }}
          />
          <Chip
            label="White-label portal"
            sx={{ bgcolor: accent, color: '#06101f', fontWeight: 950, alignSelf: 'flex-start' }}
          />
          <Typography variant="h2" fontWeight={950}>
            {competition.data.name}
          </Typography>
          <Typography sx={{ maxWidth: 720, color: 'rgba(255,255,255,0.8)' }}>
            {competition.data.description ||
              `${publicSportName(competition.data.sport)} portal powered by InstaScore.`}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              component={Link}
              to={`/competitions/${competitionUuid}`}
              variant="contained"
              sx={{ borderRadius: 0 }}
            >
              Main competition page
            </Button>
            <Button
              component={Link}
              to={`/embed/table/${competitionUuid}`}
              variant="outlined"
              sx={{ borderRadius: 0, color: '#fff', borderColor: '#fff' }}
            >
              Embed table
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ maxWidth: 1180, mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={950}>
                  Upcoming fixtures
                </Typography>
                {fixtures.isLoading && <LoadingState label="Loading fixtures" />}
                {fixtures.data?.items.length === 0 && (
                  <EmptyState title="No fixtures yet" description="Scheduling will appear here." />
                )}
                {fixtures.data?.items.map((fixture) => (
                  <Box
                    key={fixture.uuid}
                    sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}
                  >
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Typography fontWeight={900}>{fixtureTitle(fixture)}</Typography>
                      <Chip label={statusLabel(fixture.status)} size="small" />
                    </Stack>
                    <Typography color="text.secondary">{formatKickoff(fixture)}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={950}>
                  League table
                </Typography>
                {standings.isLoading && <LoadingState label="Loading standings" />}
                {standings.data?.length === 0 && (
                  <EmptyState
                    title="No standings yet"
                    description="Confirmed results will build the table."
                  />
                )}
                {standings.data?.slice(0, 6).map((row) => (
                  <Stack key={row.uuid} direction="row" justifyContent="space-between">
                    <Typography>
                      {row.position}. {row.team.name}
                    </Typography>
                    <Typography fontWeight={950}>{row.points}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
