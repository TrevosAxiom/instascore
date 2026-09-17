import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('livestream analytics administration', () => {
  it('shows viewing and sponsor performance without exposing viewer identity', async () => {
    renderApp(<AppRoutes loginUrl="/login" />, {
      route: '/admin/streaming',
      auth: adminAuth,
      api: {
        ...testApi,
        getStreamAnalytics: () =>
          Promise.resolve({
            summary: { sessions: 42, fixtures: 3, watchSeconds: 7200, averageWatchSeconds: 171 },
            devices: [{ device: 'mobile', sessions: 30, watchSeconds: 5400 }],
            sponsors: [
              {
                uuid: '00000000-0000-4000-8000-000000000991',
                sponsorName: 'Match Partner',
                campaignName: 'Season 3',
                logoUrl: '',
                destinationUrl: '',
                placement: 'in_player',
                status: 'active',
                impressions: 100,
                clicks: 12,
                startsAt: null,
                endsAt: null,
              },
            ],
          }),
      },
    });

    expect(
      await screen.findByRole('heading', { name: /Streaming analytics & sponsors/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/100 views/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/12 clicks/i)).toBeInTheDocument();
    expect(screen.queryByText(/IP address/i)).not.toBeInTheDocument();
  });
});
