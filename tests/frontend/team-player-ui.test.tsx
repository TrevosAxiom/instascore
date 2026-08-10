import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../../src/api/client';
import { PlayerDirectoryPage } from '../../src/features/players/PlayerDirectoryPage';
import { AdminTeamsPage } from '../../src/features/teams/AdminTeamsPage';
import { TeamDirectoryPage } from '../../src/features/teams/TeamDirectoryPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('Team and player milestone screens', () => {
  it('renders public team and player directories from API data', async () => {
    const api: ApiClient = {
      ...testApi,
      getTeams: () =>
        Promise.resolve({
          items: [
            {
              uuid: '00000000-0000-4000-8000-000000000101',
              name: 'Lagos Lightning',
              slug: 'lagos-lightning',
              shortName: 'Lightning',
              logoUrl: null,
              sport: {
                uuid: '00000000-0000-4000-8000-000000000001',
                name: 'Flag Football',
                slug: 'flag-football',
              },
              status: 'active',
            },
          ],
          page: 1,
          perPage: 12,
          total: 1,
          totalPages: 1,
        }),
      getPlayers: () =>
        Promise.resolve({
          items: [
            {
              uuid: '00000000-0000-4000-8000-000000000201',
              firstName: 'Ada',
              lastName: 'Okafor',
              displayName: 'Ada Okafor',
              slug: 'ada-okafor',
              photoUrl: null,
              primaryPosition: 'wr',
              eligibilityStatus: 'eligible',
              sport: {
                uuid: '00000000-0000-4000-8000-000000000001',
                name: 'Flag Football',
                slug: 'flag-football',
              },
              status: 'active',
            },
          ],
          page: 1,
          perPage: 12,
          total: 1,
          totalPages: 1,
        }),
    };

    renderApp(
      <Routes>
        <Route path="/teams" element={<TeamDirectoryPage />} />
        <Route path="/players" element={<PlayerDirectoryPage />} />
      </Routes>,
      { route: '/teams', api },
    );

    expect(await screen.findByText('Lagos Lightning')).toBeInTheDocument();

    renderApp(
      <Routes>
        <Route path="/players" element={<PlayerDirectoryPage />} />
      </Routes>,
      { route: '/players', api },
    );

    expect(await screen.findByText('Ada Okafor')).toBeInTheDocument();
  });

  it('submits an admin team form using reusable API foundations', async () => {
    const createTeam = vi.fn().mockResolvedValue({
      uuid: '00000000-0000-4000-8000-000000000101',
      name: 'Lagos Lightning',
    });
    const api: ApiClient = {
      ...testApi,
      getSports: () =>
        Promise.resolve([
          {
            uuid: '00000000-0000-4000-8000-000000000001',
            name: 'Flag Football',
            slug: 'flag-football',
          },
        ]),
      createTeam,
    };

    renderApp(<AdminTeamsPage />, { auth: adminAuth, api });

    fireEvent.click(await screen.findByRole('button', { name: 'Create team' }));
    await screen.findByRole('heading', { name: 'Create team' });
    const teamName = document.querySelector('input[name="name"]');
    const sportUuid = document.querySelector('input[name="sportUuid"]');
    expect(teamName).toBeInstanceOf(HTMLInputElement);
    expect(sportUuid).toBeInstanceOf(HTMLInputElement);

    fireEvent.change(teamName as HTMLInputElement, {
      target: { value: 'Lagos Lightning' },
    });
    fireEvent.change(sportUuid as HTMLInputElement, {
      target: { value: '00000000-0000-4000-8000-000000000001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));

    await waitFor(() =>
      expect(createTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Lagos Lightning' })),
    );
  });
});
