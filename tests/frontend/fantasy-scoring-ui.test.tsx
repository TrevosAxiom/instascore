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
    renderApp(<FantasyTransfersPage />, {
      auth: adminAuth,
      api: { ...testApi, makeFantasyTransfer },
    });

    fireEvent.click(await screen.findByRole('button', { name: /confirm transfer/i }));

    await waitFor(() => expect(makeFantasyTransfer).toHaveBeenCalled());
    expect(await screen.findByText(/cost 0 points/i)).toBeInTheDocument();
  });

  it('renders private league table rank movement for members', async () => {
    renderApp(<FantasyLeaguePage />, { auth: adminAuth });

    expect(await screen.findByText('Lagos Super League')).toBeInTheDocument();
    expect(screen.getByText(/Invite ABC123/i)).toBeInTheDocument();
    expect(screen.getByText(/88 pts · ▲2/i)).toBeInTheDocument();
  });
});
