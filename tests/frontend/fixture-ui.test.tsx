import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import type { Fixture } from '../../src/types/api';
import { renderApp, testApi } from './test-utils';

const fixture: Fixture = {
  uuid: '00000000-0000-4000-8000-000000000444',
  status: 'scheduled',
  kickoffAt: '2026-08-01 18:30:00',
  timezone: 'UTC',
  roundName: 'Group A',
  matchDay: 1,
  legNumber: null,
  bracketSlot: '',
  competition: { uuid: '00000000-0000-4000-8000-000000000222', name: 'Flag Premier' },
  season: { uuid: '00000000-0000-4000-8000-000000000333', name: '2026' },
  sport: {
    uuid: '00000000-0000-4000-8000-000000000111',
    name: 'Flag Football',
    slug: 'flag-football',
  },
  homeTeam: { uuid: '00000000-0000-4000-8000-000000000555', name: 'Lagos Lightning' },
  awayTeam: { uuid: '00000000-0000-4000-8000-000000000556', name: 'Abuja Rush' },
  venue: { uuid: '00000000-0000-4000-8000-000000000777', name: 'National Stadium' },
  updatedAt: '2026-07-30 10:00:00',
};

describe('Fixture milestone screens', () => {
  it('renders public fixtures with local kickoff details', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/fixtures',
      api: {
        ...testApi,
        getFixtures: () =>
          Promise.resolve({ items: [fixture], page: 1, perPage: 12, total: 1, totalPages: 1 }),
      },
    });

    expect(await screen.findByText('Lagos Lightning vs Abuja Rush')).toBeInTheDocument();
    expect(screen.getByText(/National Stadium/)).toBeInTheDocument();
  });

  it('renders the match centre before scoring begins', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/fixtures/${fixture.uuid}`,
      api: { ...testApi, getFixture: () => Promise.resolve(fixture) },
    });

    expect(
      await screen.findByRole('heading', { name: 'Lagos Lightning vs Abuja Rush' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Scheduled')).not.toHaveLength(0);
    expect(screen.getByText(/Live downs, scoring plays, conversions/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Scoring plays' })).toBeInTheDocument();
  });
});
