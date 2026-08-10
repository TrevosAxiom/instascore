import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

export function SearchPage() {
  const api = useApi();
  const [queryText, setQueryText] = useState('');
  const query = useQuery({
    queryKey: ['search', queryText],
    queryFn: () => api.search(queryText),
    enabled: queryText.length >= 2,
  });

  return (
    <PageScaffold
      eyebrow="Discover"
      title="Search"
      description="Find competitions, teams, players and fixture-ready entities."
    >
      <Box className="instascore-panel">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Search InstaScore"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={() => void query.refetch()}>
            Search
          </Button>
        </Stack>
      </Box>
      {query.isLoading ? <LoadingState label="Searching" /> : null}
      {query.isError ? <ErrorState description="Search could not be completed." /> : null}
      {query.data?.length === 0 ? (
        <EmptyState title="No results yet" description="Try a team, competition or player name." />
      ) : null}
      <Stack spacing={2} sx={{ mt: 3 }}>
        {query.data?.map((result) => (
          <Box className="instascore-panel" key={`${result.type}-${result.uuid}`}>
            <Typography variant="overline">{result.type}</Typography>
            <Typography variant="h3" component={Link} to={result.url}>
              {result.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </PageScaffold>
  );
}
