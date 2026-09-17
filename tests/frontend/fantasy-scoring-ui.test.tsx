import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FantasyLeaguePage } from '../../src/features/fantasy/FantasyLeaguePage';
import { FantasyPointsPage } from '../../src/features/fantasy/FantasyPointsPage';
import { FantasyTransfersPage } from '../../src/features/fantasy/FantasyTransfersPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('fantasy scoring, transfers and leagues UI', () => {
  it('shows live provisional points and revision history', async () => {
    renderApp(<FantasyPointsPage />, { auth: adminAuth });

    expect((await screen.findAllByText(/Ada Touchdown/i)).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/12 pts · provisional/i)).toBeInTheDocument();
    expect(screen.getByText(/provisional · r2/i)).toBeInTheDocument();
  });

  it('submits transfer-market changes through the server API', async () => {
    const makeFantasyTransfer = vi.fn(testApi.makeFantasyTransfer);
    const getFantasySquad = vi.fn(async (uuid: string) => {
      const state = await testApi.getFantasySquad(uuid);
      return {
        ...state,
        squad: {
          uuid: '00000000-0000-4000-8000-000000000123',
          name: 'Lagos Champions',
          status: 'submitted' as const,
          revision: 3,
          totalCostCents: 45000,
          remainingBudget: 55000,
          players: [
            {
              fantasyPlayerUuid: '00000000-0000-4000-8000-000000000121',
              slotType: 'starting' as const,
              slotNumber: 1,
              isCaptain: true,
              isViceCaptain: false,
              priceCents: 45000,
              position: { code: 'QB', name: 'Quarterback' },
              player: { uuid: '00000000-0000-4000-8000-000000000131', name: 'Ada Touchdown' },
              team: { uuid: '00000000-0000-4000-8000-000000000141', name: 'Lagos Lightning' },
            },
          ],
        },
      };
    });
    renderApp(<FantasyTransfersPage />, {
      auth: adminAuth,
      api: { ...testApi, getFantasySquad, makeFantasyTransfer },
    });

    fireEvent.mouseDown(await screen.findByLabelText(/player out/i));
    fireEvent.click(await screen.findByRole('option', { name: /Ada Touchdown/i }));
    fireEvent.mouseDown(screen.getByLabelText(/player in/i));
    fireEvent.click(await screen.findByRole('option', { name: /Tola Blitz/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm transfer/i }));

    await waitFor(() =>
      expect(makeFantasyTransfer).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000120',
        expect.objectContaining({
          outFantasyPlayerUuid: '00000000-0000-4000-8000-000000000121',
          inFantasyPlayerUuid: '00000000-0000-4000-8000-000000000124',
          baseRevision: 3,
        }),
      ),
    );
    expect(await screen.findByText(/cost 0 points/i)).toBeInTheDocument();
  });

  it('renders private league table rank movement for members', async () => {
    renderApp(<FantasyLeaguePage />, { auth: adminAuth });

    expect(await screen.findByText('Lagos Super League')).toBeInTheDocument();
    expect(screen.getByText(/Invite ABC123/i)).toBeInTheDocument();
    expect(screen.getByText(/88 pts · ▲2/i)).toBeInTheDocument();
  });
});
