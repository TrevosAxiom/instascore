import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationPreferencesPage } from '../../src/features/notifications/NotificationPreferencesPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('notification preferences UI', () => {
  it('renders categories and saves quiet-hour preferences', async () => {
    const saveNotificationPreferences = vi.fn(testApi.saveNotificationPreferences);
    const saveUserPreferences = vi.fn(testApi.saveUserPreferences);
    renderApp(<NotificationPreferencesPage />, {
      auth: adminAuth,
      api: { ...testApi, saveNotificationPreferences, saveUserPreferences },
    });

    expect(await screen.findByText('Match starting')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^language$/i), { target: { value: 'en-NG' } });
    fireEvent.click(screen.getByRole('button', { name: /save delivery settings/i }));
    await waitFor(() => expect(saveUserPreferences).toHaveBeenCalled());
    expect(saveUserPreferences.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ language: 'en-NG' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => expect(saveNotificationPreferences).toHaveBeenCalled());
    expect(saveNotificationPreferences.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'match_starting' })]),
    );
  });
});
