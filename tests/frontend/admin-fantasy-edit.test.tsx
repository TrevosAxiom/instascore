import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminFantasyPage } from '../../src/features/fantasy/AdminFantasyPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('fantasy game administration', () => {
  it('edits an existing official fantasy game without changing its competition identity', async () => {
    const updateFantasyGame = vi.fn(testApi.updateFantasyGame);
    renderApp(<AdminFantasyPage />, {
      auth: adminAuth,
      api: { ...testApi, updateFantasyGame },
    });

    fireEvent.click(await screen.findByRole('button', { name: /edit fantasy game/i }));
    expect(screen.getByText(/competition and season cannot be changed/i)).toBeInTheDocument();

    const name = screen.getByLabelText(/fantasy game name/i);
    fireEvent.change(name, { target: { value: 'CFFL Official Fantasy' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(updateFantasyGame).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000120',
        expect.objectContaining({ name: 'CFFL Official Fantasy', status: 'open' }),
      ),
    );
  });

  it('updates player prices for the selected fantasy season', async () => {
    const updateFantasyPricing = vi.fn(testApi.updateFantasyPricing);
    renderApp(<AdminFantasyPage />, {
      auth: adminAuth,
      api: { ...testApi, updateFantasyPricing },
    });

    const price = await screen.findByLabelText(/^price \(₦\)$/i);
    fireEvent.change(price, { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: /save 1 prices/i }));

    await waitFor(() =>
      expect(updateFantasyPricing).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000120', [
        { fantasyPlayerUuid: '00000000-0000-4000-8000-000000000140', priceCents: 9500 },
      ]),
    );
  });
});
