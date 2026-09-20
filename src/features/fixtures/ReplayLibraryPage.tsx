import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

export function ReplayLibraryPage() {
  const api = useApi();
  const replays = useQuery({ queryKey: ['replays'], queryFn: () => api.getReplays(48) });

  return (
    <PageScaffold
      eyebrow="Watch again"
      title="Match replays"
      description="Full match broadcasts from InstaScore competitions, available as soon as YouTube finishes processing."
      status={`${replays.data?.length ?? 0} available`}
    >
      {replays.isLoading ? <LoadingState label="Loading match replays" /> : null}
      {replays.isError ? <ErrorState description="Replays could not be loaded." /> : null}
      {replays.data?.length === 0 ? (
        <EmptyState
          title="No replays yet"
          description="Completed livestreams will appear here after YouTube finishes processing them."
        />
      ) : null}
      <Grid container spacing={2}>
        {replays.data?.map((replay) => (
          <Grid key={replay.uuid} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card sx={{ height: '100%', overflow: 'hidden' }}>
              {replay.thumbnailUrl ? (
                <CardMedia component="img" height="190" image={replay.thumbnailUrl} alt="" />
              ) : null}
              <CardContent>
                <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}>
                  <Chip size="small" color="primary" label="Replay" />
                  <Chip size="small" variant="outlined" label={replay.fixture.sport.name} />
                </Stack>
                <Typography variant="h5" fontWeight={950}>
                  {replay.fixture.homeTeam.name} vs {replay.fixture.awayTeam.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {replay.fixture.competitionName} ·{' '}
                  {new Date(`${replay.fixture.kickoffAt.replace(' ', 'T')}Z`).toLocaleDateString()}
                </Typography>
                <Stack direction="row" gap={1} sx={{ my: 2 }}>
                  <Avatar src={replay.fixture.homeTeam.logoUrl ?? undefined}>
                    {replay.fixture.homeTeam.name[0]}
                  </Avatar>
                  <Avatar src={replay.fixture.awayTeam.logoUrl ?? undefined}>
                    {replay.fixture.awayTeam.name[0]}
                  </Avatar>
                </Stack>
                <Box>
                  <Button
                    component={RouterLink}
                    to={`/fixtures/${replay.fixture.uuid}`}
                    variant="contained"
                  >
                    Watch replay
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PageScaffold>
  );
}
