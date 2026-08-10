import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminProvidersPage } from '../../src/features/providers/AdminProvidersPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('football provider admin UI', () => {
  it('shows provider health without exposing secrets and runs a dry-run sync', async () => {
    const syncProvider = vi.fn(testApi.syncProvider);
    renderApp(<AdminProvidersPage />, {
      auth: adminAuth,
      api: { ...testApi, syncProvider },
    });

    expect(await screen.findByText('approved_football_provider')).toBeInTheDocument();
    expect(screen.getByText(/Secrets exposed to browser: no/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /run sync/i }));
    await waitFor(() => expect(syncProvider).toHaveBeenCalled());
    expect(syncProvider.mock.calls[0]?.[0]).toBe('football');
    expect(syncProvider.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ syncType: 'fixtures', dryRun: true }),
    );
  });
});
