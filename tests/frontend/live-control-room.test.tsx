import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminFixturesPage } from '../../src/features/fixtures/AdminFixturesPage';
import { renderApp, testApi } from './test-utils';

describe('YouTube live control room', () => {
  it('shows stream health and runs safe fixture matching', async () => {
    const autoMatchYouTubeBroadcasts = vi.fn(() =>
      Promise.resolve([
        {
          videoId: 'M7lc1UVf-VE',
          fixtureUuid: '00000000-0000-4000-8000-000000000010',
          score: 100,
        },
      ]),
    );
    renderApp(<AdminFixturesPage />, {
      api: {
        ...testApi,
        autoMatchYouTubeBroadcasts,
        getYouTubeControlRoom: () =>
          Promise.resolve({
            health: {
              connected: true,
              total: 1,
              live: 1,
              failed: 0,
              stale: 0,
              items: [
                {
                  fixtureUuid: '00000000-0000-4000-8000-000000000010',
                  fixtureName: 'Lagos Wolverines vs Lagos Titans',
                  videoId: 'M7lc1UVf-VE',
                  status: 'live',
                  lastSyncedAt: '2026-08-01 15:05:00',
                  stale: false,
                  errorMessage: null,
                },
              ],
            },
            broadcasts: [],
            reviewQueue: [],
            refreshedAt: '2026-08-01T15:05:00Z',
          }),
      },
    });

    fireEvent.click(await screen.findByRole('button', { name: /open live control room/i }));
    expect(await screen.findByText('Lagos Wolverines vs Lagos Titans')).toBeInTheDocument();
    expect(screen.getByText(/All attached streams are reporting normally/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /auto-match safe suggestions/i }));
    await waitFor(() => expect(autoMatchYouTubeBroadcasts).toHaveBeenCalledOnce());
  });
});
