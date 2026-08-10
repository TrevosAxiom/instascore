import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('Standings, statistics and discipline UI', () => {
  it('renders a public league table with tiebreaker context', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/standings',
      api: {
        ...testApi,
        getCompetitions: () =>
          Promise.resolve({
            items: [
              {
                uuid: 'competition-1',
                name: 'Lagos Flag League',
                slug: 'lagos-flag-league',
                type: 'league',
                description: '',
                countryCode: 'NG',
                sport: { uuid: 'sport-1', name: 'Flag Football', slug: 'flag-football' },
                rules: {},
                status: 'active',
                updatedAt: '2026-08-01T00:00:00Z',
              },
            ],
            page: 1,
            perPage: 12,
            total: 1,
            totalPages: 1,
          }),
        getStandings: () =>
          Promise.resolve([
            {
              uuid: 'row-1',
              position: 1,
              team: { uuid: 'team-1', name: 'Lagos Lightning' },
              played: 2,
              wins: 2,
              draws: 0,
              losses: 0,
              points: 6,
              pointsFor: 40,
              pointsAgainst: 18,
              pointDifference: 22,
              form: 'WW',
              rebuildHash: 'hash',
              tiebreakerOrder: ['points', 'wins', 'point_difference'],
            },
          ]),
      },
    });

    expect(await screen.findByText('Lagos Lightning')).toBeInTheDocument();
    expect(screen.getByText(/points, wins, point_difference/i)).toBeInTheDocument();
  });

  it('renders player leaders for selected flag-football statistics', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/players/leaders',
      api: {
        ...testApi,
        getPlayerLeaders: () =>
          Promise.resolve([
            {
              player: { uuid: 'player-1', name: 'Ada Quick' },
              team: { uuid: 'team-1', name: 'Lightning' },
              statKey: 'touchdowns',
              statValue: 5,
            },
          ]),
      },
    });

    expect(await screen.findByText(/Ada Quick/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('submits discipline records through the audited admin workflow', async () => {
    const createDisciplineRecord = vi.fn(() => Promise.resolve({ uuid: 'discipline-1' }));
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/admin/discipline',
      auth: adminAuth,
      api: { ...testApi, createDisciplineRecord },
    });

    fireEvent.change(await screen.findByLabelText('Reason'), {
      target: { value: 'Unsporting conduct' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create audited record' }));

    expect(await screen.findByText('Discipline record created and audited.')).toBeInTheDocument();
    expect(createDisciplineRecord).toHaveBeenCalledWith(
      expect.objectContaining({ recordType: 'suspension', reason: 'Unsporting conduct' }),
    );
  });
});
