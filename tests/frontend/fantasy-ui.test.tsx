import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FantasyDashboardPage } from '../../src/features/fantasy/FantasyDashboardPage';
import type { FantasySquadEntry } from '../../src/types/api';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('fantasy foundation UI', () => {
  it('renders player pool, tracks budget and saves a squad through the server API', async () => {
    const saveFantasySquad = vi.fn(testApi.saveFantasySquad);
    renderApp(<FantasyDashboardPage />, {
      auth: adminAuth,
      api: { ...testApi, saveFantasySquad },
    });

    expect(await screen.findByText('InstaScore Fantasy')).toBeInTheDocument();
    expect(await screen.findByText(/Ada Touchdown/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /select Ada Touchdown/i }));

    expect(await screen.findByText(/Remaining ₦550/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(saveFantasySquad).toHaveBeenCalled());
    const payload = saveFantasySquad.mock.calls[0]?.[1] as
      { baseRevision: number; players: FantasySquadEntry[] } | undefined;
    expect(payload?.baseRevision).toBe(0);
    expect(payload?.players[0]).toMatchObject({
      fantasyPlayerUuid: '00000000-0000-4000-8000-000000000121',
      isCaptain: true,
    });
  });

  it('places every manager in the official competition without private league controls', async () => {
    const createFantasyLeague = vi.fn(testApi.createFantasyLeague);
    const joinFantasyLeague = vi.fn(testApi.joinFantasyLeague);
    renderApp(<FantasyDashboardPage />, {
      auth: adminAuth,
      api: { ...testApi, createFantasyLeague, joinFantasyLeague },
    });

    expect(await screen.findByText(/Everyone plays in one league/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create league/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join league/i })).not.toBeInTheDocument();
    expect(createFantasyLeague).not.toHaveBeenCalled();
    expect(joinFantasyLeague).not.toHaveBeenCalled();
  });
});
