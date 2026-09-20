import {
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import { publicSportName } from '../../utils/publicSportName';
import { fixtureTitle, formatKickoff, statusLabel } from '../fixtures/fixtureFormat';

export function CompetitionDetailPage() {
  const api = useApi();
  const { uuid = '' } = useParams();
  const [tab, setTab] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState('');
  const query = useQuery({
    queryKey: ['competition', uuid],
    queryFn: () => api.getCompetition(uuid),
    enabled: Boolean(uuid),
  });
  if (query.isLoading) return <LoadingState label="Loading competition" />;
  if (query.isError || !query.data)
    return <ErrorState title="Competition unavailable" description="The record was not found." />;

  const competition = query.data;
  const seasons = competition.seasons ?? [];
  const seasonUuid =
    selectedSeason || String(competition.rules.default_season_uuid ?? '') || seasons[0]?.uuid || '';
  const fixtures = useQuery({
    queryKey: ['competition-fixtures', uuid, seasonUuid],
    queryFn: () =>
      api.getFixtures(
        new URLSearchParams({ competition: uuid, season: seasonUuid, per_page: '50' }),
      ),
    enabled: Boolean(uuid && seasonUuid),
  });
  const table = useQuery({
    queryKey: ['standings', uuid, seasonUuid],
    queryFn: () => api.getStandings(uuid, seasonUuid),
    enabled: Boolean(uuid && seasonUuid),
  });
  return (
    <PageScaffold
      eyebrow={publicSportName(competition.sport)}
      title={competition.name}
      description={competition.description || 'Competition overview and seasons.'}
      status={competition.type}
    >
      <EntityAvatar
        entity="competition"
        src={competition.logoUrl}
        alt={`${competition.name} logo`}
        sx={{ width: 88, height: 88 }}
      />
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip label={competition.type} color="primary" />
        {competition.countryCode && <Chip label={competition.countryCode} variant="outlined" />}
      </Stack>
      {seasons.length ? (
        <Stack spacing={1.5}>
          <TextField
            select
            label="Season"
            value={seasonUuid}
            onChange={(event) => setSelectedSeason(event.target.value)}
            sx={{ maxWidth: 320 }}
          >
            {seasons.map((item) => (
              <MenuItem key={item.uuid} value={item.uuid}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <Paper variant="outlined">
            <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable">
              <Tab label="Overview" />
              <Tab label="Fixtures & results" />
              <Tab label="Table" />
              <Tab label="Playoffs" />
            </Tabs>
          </Paper>
          {tab === 0 ? (
            <Stack spacing={1}>
              {seasons
                .filter((item) => item.uuid === seasonUuid)
                .map((item) => (
                  <Paper key={item.uuid} variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={900}>{item.name}</Typography>
                    <Typography color="text.secondary">
                      {new Date(item.startDate).toLocaleDateString()} –{' '}
                      {new Date(item.endDate).toLocaleDateString()}
                    </Typography>
                    <Chip label={item.status} size="small" sx={{ mt: 1 }} />
                  </Paper>
                ))}
            </Stack>
          ) : null}
          {tab === 1 ? (
            <Stack spacing={1}>
              {fixtures.data?.items.map((fixture) => (
                <Paper key={fixture.uuid} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" gap={1}>
                    <div>
                      <Typography fontWeight={850}>{fixtureTitle(fixture)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fixture.roundName} · {formatKickoff(fixture)}
                      </Typography>
                    </div>
                    <Chip label={statusLabel(fixture.status)} size="small" />
                  </Stack>
                </Paper>
              ))}
              {!fixtures.isLoading && !fixtures.data?.items.length ? (
                <EmptyState
                  title="No fixtures in this season"
                  description="Published fixtures will appear here."
                />
              ) : null}
            </Stack>
          ) : null}
          {tab === 2 ? (
            <Stack spacing={1}>
              {table.data?.map((row) => (
                <Paper key={row.uuid} variant="outlined" sx={{ p: 1.25 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography width={28} fontWeight={950}>
                      {row.position}
                    </Typography>
                    <Typography flex={1} fontWeight={850}>
                      {row.team.name}
                    </Typography>
                    <Typography>{row.played} P</Typography>
                    <Typography fontWeight={950}>{row.points} pts</Typography>
                  </Stack>
                </Paper>
              ))}
              {!table.isLoading && !table.data?.length ? (
                <EmptyState
                  title="Table not available yet"
                  description="The table updates after confirmed results."
                />
              ) : null}
            </Stack>
          ) : null}
          {tab === 3 ? (
            <Stack spacing={1}>
              {fixtures.data?.items
                .filter((fixture) => fixture.bracketSlot)
                .map((fixture) => (
                  <Paper key={fixture.uuid} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="overline" color="primary.main">
                      {fixture.bracketSlot}
                    </Typography>
                    <Typography fontWeight={900}>{fixtureTitle(fixture)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatKickoff(fixture)} · {statusLabel(fixture.status)}
                    </Typography>
                  </Paper>
                ))}
              {!fixtures.isLoading &&
              !fixtures.data?.items.some((fixture) => fixture.bracketSlot) ? (
                <EmptyState
                  title="Playoffs not seeded"
                  description="The bracket will appear after qualification is complete."
                />
              ) : null}
            </Stack>
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button component={Link} to="/fixtures" variant="contained">
              View fixtures
            </Button>
            <Button component={Link} to="/results" variant="outlined">
              View results
            </Button>
            <Button component={Link} to="/standings" variant="outlined">
              View table
            </Button>
          </Stack>
        </Stack>
      ) : (
        <EmptyState
          title="No active seasons"
          description="An administrator has not added one yet."
        />
      )}
    </PageScaffold>
  );
}
