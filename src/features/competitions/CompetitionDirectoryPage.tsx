import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import { useApi } from '../../api/context';
import { publicSportName } from '../../utils/publicSportName';
import { ErrorState, LoadingState, EmptyState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { EntityAvatar } from '../../components/EntityAvatar';
import { SportSwitcher } from '../../components/SportSwitcher';

export function CompetitionDirectoryPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sport, setSport] = useState('');
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const query = useQuery({
    queryKey: ['competitions', search, sport, page],
    queryFn: () =>
      api.getCompetitions(
        new URLSearchParams({ page: String(page), per_page: '12', search, sport, sort: 'name' }),
      ),
  });

  return (
    <PageScaffold
      eyebrow="Discover competitions"
      title="Competitions"
      description="Browse active InstaScore leagues, cups and tournaments."
      status="Public directory"
    >
      <SportSwitcher
        sports={sports.data ?? []}
        value={sport}
        onChange={(value) => {
          setSport(value);
          setPage(1);
        }}
      />
      <TextField
        label="Search competitions"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {query.isLoading && <LoadingState label="Loading competitions" />}
      {query.isError && (
        <ErrorState
          title="Competitions unavailable"
          description="Please retry the public directory."
        />
      )}
      {query.data?.items.length === 0 && (
        <EmptyState title="No competitions found" description="Try a different search." />
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {query.data?.items.map((competition) => (
          <Card key={competition.uuid} variant="outlined">
            <CardActionArea
              component={Link}
              to={`/competitions/${competition.uuid}`}
              sx={{ height: '100%' }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Chip label={publicSportName(competition.sport)} size="small" color="primary" />
                    <Typography variant="caption">{competition.type}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <EntityAvatar
                      entity="competition"
                      src={competition.logoUrl}
                      alt={`${competition.name} logo`}
                      sx={{ width: 52, height: 52 }}
                    />
                    <Typography variant="h6">{competition.name}</Typography>
                  </Stack>
                  <Typography color="text.secondary">
                    {competition.description || 'Competition details and seasons.'}
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
      {(query.data?.totalPages ?? 0) > 1 && (
        <Pagination
          page={page}
          count={query.data?.totalPages}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      )}
      <Button component={Link} to="/admin" sx={{ alignSelf: 'flex-start' }}>
        Competition administration
      </Button>
    </PageScaffold>
  );
}
