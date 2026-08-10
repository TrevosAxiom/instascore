import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FavouritesPage } from '../../src/features/favourites/FavouritesPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('favourites and anonymous migration UI', () => {
  const team = {
    uuid: '00000000-0000-4000-8000-000000000010',
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
  };

  it('stores anonymous favourites locally before login', async () => {
    localStorage.clear();
    renderApp(<FavouritesPage />, {
      api: {
        ...testApi,
        getTeams: () =>
          Promise.resolve({ items: [team], page: 1, perPage: 12, total: 1, totalPages: 1 }),
      },
    });

    expect(await screen.findByRole('heading', { name: 'Local favourites' })).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Team'), {
      target: { value: team.uuid },
    });
    fireEvent.click(screen.getByRole('button', { name: /toggle locally/i }));

    await waitFor(() => expect(screen.getByText(/team:\s*Lagos Lightning/i)).toBeInTheDocument());
    expect(localStorage.getItem('instascore-anonymous-favourites')).toContain('team');
  });

  it('allows authenticated users to follow and unfollow entities', async () => {
    const followFavourite = vi.fn(testApi.followFavourite);
    const unfollowFavourite = vi.fn(testApi.unfollowFavourite);
    renderApp(<FavouritesPage />, {
      auth: adminAuth,
      api: {
        ...testApi,
        followFavourite,
        unfollowFavourite,
        getTeams: () =>
          Promise.resolve({ items: [team], page: 1, perPage: 12, total: 1, totalPages: 1 }),
        getFavourites: () =>
          Promise.resolve([
            {
              uuid: '00000000-0000-4000-8000-000000000012',
              entity_type: 'team',
              entity_uuid: '00000000-0000-4000-8000-000000000010',
              status: 'active',
            },
          ]),
      },
    });

    expect(await screen.findByText(/personal scores feed/i)).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Team'), {
      target: { value: team.uuid },
    });
    fireEvent.click(screen.getByRole('button', { name: /^follow$/i }));
    await waitFor(() => expect(followFavourite).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /unfollow/i }));
    await waitFor(() =>
      expect(unfollowFavourite).toHaveBeenCalledWith(
        'team',
        '00000000-0000-4000-8000-000000000010',
      ),
    );
  });
});
