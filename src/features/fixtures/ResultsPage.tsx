import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { SportSwitcher } from '../../components/SportSwitcher';
import { FixtureCards } from './FixtureCards';
import { ProviderUpcomingCards } from './ProviderUpcomingCards';

export function ResultsPage() {
  const api = useApi();
  const [searchParams] = useSearchParams();
  const [sport, setSport] = useState(searchParams.get('sport') ?? '');
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const params = useMemo(() => new URLSearchParams(sport ? { sport } : {}), [sport]);
  const query = useQuery({ queryKey: ['results', sport], queryFn: () => api.getResults(params) });
  const footballResults = useQuery({
    queryKey: ['provider-previous', 'football', 'results'],
    queryFn: () => api.getProviderMatches('football', 'previous'),
    enabled: !sport || sport === 'football',
  });
  const basketballResults = useQuery({
    queryKey: ['provider-previous', 'basketball', 'results'],
    queryFn: () => api.getProviderMatches('basketball', 'previous'),
    enabled: !sport || sport === 'basketball',
  });
  const providerResults = [...(footballResults.data ?? []), ...(basketballResults.data ?? [])];
  return (
    <PageScaffold
      eyebrow="Results"
      title="Results"
      description="Final scores from completed and confirmed matches."
    >
      <SportSwitcher sports={sports.data ?? []} value={sport} onChange={setSport} />
      {query.isLoading && <LoadingState label="Loading results" />}
      {query.isError && <ErrorState title="Results could not be loaded." />}
      {query.data?.items.length === 0 && providerResults.length === 0 && (
        <EmptyState
          title="No final scores yet"
          description="Results will appear after an organiser completes or confirms a match."
        />
      )}
      <FixtureCards fixtures={query.data?.items ?? []} />
      <ProviderUpcomingCards matches={providerResults} kind="finished" />
    </PageScaffold>
  );
}
