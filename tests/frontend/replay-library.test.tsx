import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReplayLibraryPage } from '../../src/features/fixtures/ReplayLibraryPage';
import { renderApp, testApi } from './test-utils';

describe('replay library', () => {
  it('lists processed public broadcasts and links back to the match centre', async () => {
    renderApp(<ReplayLibraryPage />, {
      api: {
        ...testApi,
        getReplays: () =>
          Promise.resolve([
            {
              uuid: '00000000-0000-4000-8000-000000000901',
              provider: 'youtube',
              videoId: 'M7lc1UVf-VE',
              watchUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
              embedUrl: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
              title: 'Full match',
              status: 'replay_available',
              visibility: 'public',
              embedEnabled: true,
              chatEnabled: false,
              featured: true,
              replayAvailable: true,
              scheduledStart: '2026-08-01 15:00:00',
              lastSyncedAt: '2026-08-01 18:00:00',
              errorMessage: null,
              thumbnailUrl: '',
              fixture: {
                uuid: '00000000-0000-4000-8000-000000000010',
                kickoffAt: '2026-08-01 15:00:00',
                competitionName: 'CFFL Lagos',
                sport: { name: 'Flag Football', slug: 'flag-football' },
                homeTeam: { name: 'Wolverines', logoUrl: null },
                awayTeam: { name: 'Titans', logoUrl: null },
              },
            },
          ]),
      },
    });

    expect(await screen.findByText('Wolverines vs Titans')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /watch replay/i })).toHaveAttribute(
      'href',
      '/fixtures/00000000-0000-4000-8000-000000000010',
    );
  });
});
