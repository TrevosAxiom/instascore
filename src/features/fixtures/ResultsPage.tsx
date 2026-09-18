import { useSearchParams } from 'react-router';

import { PageScaffold } from '../../components/PageScaffold';
import { LiveScoresBoard } from './LiveScoresBoard';

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  return (
    <PageScaffold
      eyebrow="Results archive"
      title="Results"
      description="Choose a match day and sport to browse final scores, separated by competition."
    >
      <LiveScoresBoard initialSport={searchParams.get('sport') ?? ''} initialFilter="finished" />
    </PageScaffold>
  );
}
