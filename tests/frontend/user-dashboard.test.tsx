import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserDashboardPage } from '../../src/routes/UserDashboardPage';
import type { AuthContextValue } from '../../src/app/auth-context';
import { adminAuth, renderApp, testApi } from './test-utils';

const fanAuth: AuthContextValue = {
  state: {
    authenticated: true,
    nonce: 'test',
    theme: 'system',
    user: {
      uuid: '00000000-0000-4000-8000-000000000002',
      displayName: 'Ayo Fan',
      roles: ['subscriber'],
      capabilities: {
        accessAdmin: false,
        accessOperations: false,
        manageLeagues: false,
        manageCompetitions: false,
        manageTeams: false,
        managePlayers: false,
        manageVenues: false,
        manageOfficials: false,
        manageFixtures: false,
        manageScoring: false,
        confirmResults: false,
      },
    },
  },
  isLoading: false,
  isError: false,
};

describe('adaptive user dashboard', () => {
  it('shows personal match-day content to a fan', async () => {
    renderApp(<UserDashboardPage />, {
      auth: fanAuth,
      api: {
        ...testApi,
        getFixtures: vi
          .fn()
          .mockResolvedValue({ items: [], page: 1, perPage: 50, total: 0, totalPages: 0 }),
        getPersonalFeed: vi.fn().mockResolvedValue({ favourites: [], items: [], suggestions: [] }),
      },
    });
    expect(
      await screen.findByRole('heading', { name: 'Welcome back, Ayo Fan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your match-day home')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Follow teams' })).toBeInTheDocument();
  });

  it('shows competition readiness and management actions to an administrator', async () => {
    renderApp(<UserDashboardPage />, {
      auth: adminAuth,
      api: {
        ...testApi,
        getAdminFixtures: vi
          .fn()
          .mockResolvedValue({ items: [], page: 1, perPage: 50, total: 0, totalPages: 0 }),
      },
    });
    expect(
      await screen.findByRole('heading', { name: 'Welcome back, League Admin' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Competition readiness')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage competitions' })).toBeInTheDocument();
  });
});
