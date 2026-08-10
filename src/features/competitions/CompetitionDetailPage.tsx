import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import { publicSportName } from '../../utils/publicSportName';

export function CompetitionDetailPage() {
  const api = useApi();
  const { uuid = '' } = useParams();
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
          <Typography variant="h5">Seasons</Typography>
          {seasons.map((item) => (
            <Paper key={item.uuid} variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                <div>
                  <Typography fontWeight={800}>{item.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                      new Date(item.startDate),
                    )}{' '}
                    –{' '}
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                      new Date(item.endDate),
                    )}
                  </Typography>
                </div>
                <Chip label={item.status} size="small" variant="outlined" />
              </Stack>
            </Paper>
          ))}
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
