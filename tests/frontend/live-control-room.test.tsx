import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminFixturesPage } from '../../src/features/fixtures/AdminFixturesPage';
import { renderApp, testApi } from './test-utils';

describe('YouTube live control room', () => {
  it('imports fixture CSV files from the fixture manager', async () => {
    const importFixturesCsv = vi.fn(testApi.importFixturesCsv);
    renderApp(<AdminFixturesPage />, { api: { ...testApi, importFixturesCsv } });

    const input = await screen.findByLabelText('Fixtures CSV file');
    fireEvent.change(input, {
      target: {
        files: [
          new File(['competition_slug,home_team_slug,away_team_slug,kickoff_at'], 'fixtures.csv', {
            type: 'text/csv',
          }),
        ],
      },
    });

    await waitFor(() => expect(importFixturesCsv).toHaveBeenCalledOnce());
    expect(await screen.findByText(/Import complete: 2 created/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sample csv/i })).toBeInTheDocument();
  });

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
            readiness: {
              ready: true,
              checks: [
                { key: 'channel', label: 'YouTube channel connected', ready: true, guidance: '' },
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
