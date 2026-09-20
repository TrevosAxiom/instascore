import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

export function SearchPage() {
  const api = useApi();
  const [queryText, setQueryText] = useState('');
  const [type, setType] = useState('all');
  const deferredQuery = useDeferredValue(queryText.trim());
  const query = useQuery({
    queryKey: ['search', deferredQuery],
    queryFn: () => api.search(deferredQuery),
    enabled: deferredQuery.length >= 2,
  });
  const results = useMemo(
    () => (query.data ?? []).filter((item) => type === 'all' || item.type === type),
    [query.data, type],
  );

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
      {query.data?.length ? (
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
          {['all', 'team', 'player', 'competition', 'fixture', 'news'].map((value) => (
            <Chip
              key={value}
              clickable
              color={type === value ? 'primary' : 'default'}
              label={value === 'all' ? 'All results' : value}
              onClick={() => setType(value)}
            />
          ))}
        </Stack>
      ) : null}
      {query.isLoading ? <LoadingState label="Searching" /> : null}
      {query.isError ? <ErrorState description="Search could not be completed." /> : null}
      {deferredQuery.length >= 2 && results.length === 0 && !query.isLoading ? (
        <EmptyState title="No results yet" description="Try a team, competition or player name." />
      ) : null}
      <Stack spacing={2} sx={{ mt: 3 }}>
        {results.map((result) => (
          <Box className="instascore-panel" key={`${result.type}-${result.uuid}`}>
            <Typography variant="overline">{result.type}</Typography>
            <Typography variant="h3" component={Link} to={result.url}>
              {result.label}
            </Typography>
            {result.description ? (
              <Typography color="text.secondary">{result.description}</Typography>
            ) : null}
          </Box>
        ))}
      </Stack>
    </PageScaffold>
  );
}
