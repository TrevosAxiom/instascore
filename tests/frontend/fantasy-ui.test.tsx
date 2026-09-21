import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FantasyDashboardPage } from '../../src/features/fantasy/FantasyDashboardPage';
import { AppRoutes } from '../../src/app/AppRoutes';
import type { FantasySquadEntry } from '../../src/types/api';
import { adminAuth, guestAuth, renderApp, testApi } from './test-utils';

describe('fantasy foundation UI', () => {
  beforeEach(() => {
    localStorage.setItem('instascore-fantasy-guide-v1', 'complete');
  });

  it('renders player pool, tracks budget and saves a squad through the server API', async () => {
    const saveFantasySquad = vi.fn(testApi.saveFantasySquad);
    renderApp(<FantasyDashboardPage />, {
      auth: adminAuth,
      api: { ...testApi, saveFantasySquad },
    });

    expect(await screen.findByText('InstaScore Fantasy')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/fantasy team name/i), {
      target: { value: 'Lagos Blitz Crew' },
    });
    expect(await screen.findByText(/Ada Touchdown/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /select Ada Touchdown/i }));

    expect(await screen.findByText(/Remaining ₦550/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => expect(saveFantasySquad).toHaveBeenCalled());
    const payload = saveFantasySquad.mock.calls[0]?.[1] as
      { name: string; baseRevision: number; players: FantasySquadEntry[] } | undefined;
    expect(payload?.name).toBe('Lagos Blitz Crew');
    expect(payload?.baseRevision).toBe(0);
    expect(payload?.players[0]).toMatchObject({
      fantasyPlayerUuid: '00000000-0000-4000-8000-000000000121',
      isCaptain: true,
    });
  });

  it('allows guests to browse the fantasy builder and weekly performance table', async () => {
    renderApp(<AppRoutes loginUrl="/login" />, { route: '/fantasy', auth: guestAuth });

    expect(await screen.findByText('InstaScore Fantasy')).toBeInTheDocument();
    expect(await screen.findByText(/weekly performance table/i)).toBeInTheDocument();
    expect(screen.getByText('Touchdown Kings')).toBeInTheDocument();
    expect(screen.getByText(/sign in only when you are ready/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled();
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

  it('adds a player from a pitch slot and exposes saved gameweek history', async () => {
    renderApp(<FantasyDashboardPage />, {
      auth: adminAuth,
      api: {
        ...testApi,
        getFantasySquadHistory: () =>
          Promise.resolve([
            {
              squadUuid: '00000000-0000-4000-8000-000000000150',
              teamName: 'Lagos Blitz Crew',
              gameweekUuid: '00000000-0000-4000-8000-000000000122',
              gameweekName: 'Gameweek 1',
              sequenceNumber: 1,
              deadlineAt: '2026-08-01 12:00:00',
              status: 'submitted' as const,
              gameweekStatus: 'completed',
              gameweekPoints: 74,
              seasonPoints: 74,
              rank: 1,
              pointsStatus: 'confirmed',
              players: [],
            },
          ]),
      },
    });

    fireEvent.click(await screen.findByRole('button', { name: /add offense player/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/add an offensive player/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /select Ada Touchdown/i }));
    expect(await screen.findByText(/Ada Touchdown added to your starting lineup/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/My squad history/i)).toBeInTheDocument();
    expect(await screen.findByText(/Lagos Blitz Crew/)).toBeInTheDocument();
    expect(await screen.findByText('74 pts')).toBeInTheDocument();
    expect(screen.getByText(/regulated head-to-head stakes/i)).toBeInTheDocument();
  });

  it('shows an animated, replayable first-visit guide without trapping returning users', async () => {
    localStorage.removeItem('instascore-fantasy-guide-v1');
    renderApp(<FantasyDashboardPage />, { auth: adminAuth });

    const guide = await screen.findByRole('dialog', { name: /make it yours/i });
    expect(within(guide).getByText(/step 1/i)).toBeInTheDocument();
    fireEvent.click(within(guide).getByRole('button', { name: /next/i }));
    expect(await screen.findByRole('dialog', { name: /tap a \+ on the pitch/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /skip guide/i }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /tap a \+/i })).not.toBeInTheDocument());
    expect(localStorage.getItem('instascore-fantasy-guide-v1')).toBe('skipped');
    fireEvent.click(screen.getByRole('button', { name: /show guide/i }));
    expect(await screen.findByRole('dialog', { name: /make it yours/i })).toBeInTheDocument();
  });
});
