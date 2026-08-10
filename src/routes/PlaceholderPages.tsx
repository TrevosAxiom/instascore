import { EmptyState } from '../components/AsyncStates';
import { PageScaffold } from '../components/PageScaffold';

const pageCopy = {
  fantasy: ['Fantasy', 'Fantasy squad and league logic remains intentionally unavailable.'],
  news: ['News', 'Competition announcements and match reports will appear here.'],
  more: ['More', 'Explore teams, competitions and account preferences.'],
  operations: ['Match Operations', 'Assigned match officials can open their match controls here.'],
} as const;

export type PlaceholderPageName = keyof typeof pageCopy;

export function PlaceholderPage({ page }: { page: PlaceholderPageName }) {
  const [title, description] = pageCopy[page];
  return (
    <PageScaffold eyebrow="InstaScore platform" title={title} description={description}>
      <EmptyState
        title={page === 'news' ? 'No stories published yet' : 'Nothing to show yet'}
        description={
          page === 'news'
            ? 'News and match reports will appear after an organiser publishes them.'
            : 'This area will update when relevant platform activity is available.'
        }
      />
    </PageScaffold>
  );
}
