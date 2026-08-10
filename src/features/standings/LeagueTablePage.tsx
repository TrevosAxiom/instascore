import { Alert, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { SportSwitcher } from '../../components/SportSwitcher';

export function LeagueTablePage() {
  const api = useApi();
  const [searchParams] = useSearchParams();
  const [competitionUuid, setCompetitionUuid] = useState('');
  const [sport, setSport] = useState(searchParams.get('sport') ?? '');
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const competitions = useQuery({
    queryKey: ['standings', 'competitions'],
    queryFn: () => api.getCompetitions(),
  });
  const filteredCompetitions = (competitions.data?.items ?? []).filter(
    (competition) => !sport || competition.sport.slug === sport,
  );
  useEffect(() => {
    if (!filteredCompetitions.some((competition) => competition.uuid === competitionUuid)) {
      setCompetitionUuid(filteredCompetitions[0]?.uuid ?? '');
    }
  }, [competitionUuid, filteredCompetitions]);
  const query = useQuery({
    queryKey: ['standings', competitionUuid],
    queryFn: () => api.getStandings(competitionUuid),
    enabled: Boolean(competitionUuid),
  });

  return (
    <PageScaffold
      eyebrow="Tables"
      title="League Table"
      description="Choose a competition to view its latest confirmed standings."
    >
      <SportSwitcher sports={sports.data ?? []} value={sport} onChange={setSport} />
      <TextField
        select
        SelectProps={{ native: true }}
        label="Competition"
        value={competitionUuid}
        onChange={(event) => setCompetitionUuid(event.target.value)}
        sx={{ minWidth: { xs: '100%', sm: 320 }, mb: 3 }}
      >
        <option value="">Select a competition</option>
        {filteredCompetitions.map((competition) => (
          <option key={competition.uuid} value={competition.uuid}>
            {competition.name}
          </option>
        ))}
      </TextField>
      {competitions.isLoading && <LoadingState label="Loading competitions" />}
      {competitions.data?.items.length === 0 && (
        <EmptyState
          title="No competitions available"
          description="Standings will be available after an organiser publishes a competition."
        />
      )}
      {query.isLoading && <LoadingState label="Loading standings" />}
      {query.isError && <ErrorState title="Standings could not be loaded." />}
      {query.data && query.data.length === 0 && (
        <EmptyState
          title="No standings yet"
          description="The table will populate after completed matches are confirmed."
        />
      )}
      {query.data && query.data.length > 0 && (
        <Stack spacing={1.25}>
          <Alert severity="info">Sorted by {query.data[0]?.tiebreakerOrder.join(', ')}.</Alert>
          {query.data.map((row) => (
            <Card key={row.uuid} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="h5" color="primary" fontWeight={900}>
                    {row.position}
                  </Typography>
                  <Stack sx={{ flex: 1 }}>
                    <Typography variant="h6">{row.team.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      P {row.played} · W {row.wins} · D {row.draws} · L {row.losses} · PF{' '}
                      {row.pointsFor} · PA {row.pointsAgainst} · Diff {row.pointDifference}
                    </Typography>
                  </Stack>
                  <Stack alignItems="flex-end">
                    <Typography variant="h5" fontWeight={900}>
                      {row.points}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.form || '—'}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </PageScaffold>
  );
}
