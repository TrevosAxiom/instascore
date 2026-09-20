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

  it('creates and joins private mini leagues from the fantasy workspace', async () => {
    const createFantasyLeague = vi.fn(testApi.createFantasyLeague);
    const joinFantasyLeague = vi.fn(testApi.joinFantasyLeague);
    renderApp(<FantasyDashboardPage />, {
      auth: adminAuth,
      api: { ...testApi, createFantasyLeague, joinFantasyLeague },
    });

    fireEvent.change(await screen.findByLabelText(/new league name/i), {
      target: { value: 'Weekend rivals' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create league/i }));
    await waitFor(() =>
      expect(createFantasyLeague).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ name: 'Weekend rivals', visibility: 'private' }),
      ),
    );

    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: 'abc123' } });
    fireEvent.click(screen.getByRole('button', { name: /join league/i }));
    await waitFor(() => expect(joinFantasyLeague).toHaveBeenCalledWith('ABC123'));
  });
});
