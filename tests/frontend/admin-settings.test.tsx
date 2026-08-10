import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('admin dashboard and settings', () => {
  it('renders a real admin overview with section navigation', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/admin',
      auth: adminAuth,
    });

    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: /Administration navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute(
      'href',
      '/admin/settings',
    );
    expect(await screen.findByRole('link', { name: /Open Competitions/i })).toHaveAttribute(
      'href',
      '/admin/competitions',
    );
  });

  it('keeps competition administration available on its own admin route', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/admin/competitions',
      auth: adminAuth,
    });

    expect(await screen.findByRole('heading', { name: 'Competition setup' })).toBeInTheDocument();
  });

  it('renders settings controls and persists safe operational settings', async () => {
    const updateOperationsSettings = vi.fn(testApi.updateOperationsSettings);

    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/admin/settings',
      auth: adminAuth,
      api: { ...testApi, updateOperationsSettings },
    });

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText(/saved provider keys are never sent back/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Maintenance mode/i));
    await waitFor(() =>
      expect(updateOperationsSettings).toHaveBeenCalledWith({ maintenanceMode: true }),
    );

    fireEvent.click(screen.getByText(/providerSync: on/i));
    await waitFor(() =>
      expect(updateOperationsSettings).toHaveBeenCalledWith({
        featureFlags: { providerSync: false, fantasy: true, pushNotifications: true },
      }),
    );
  });

  it('exposes CFFL Lagos bootstrap and provider polling controls', async () => {
    const runOperationsAction = vi.fn(testApi.runOperationsAction);

    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/admin/settings',
      auth: adminAuth,
      api: { ...testApi, runOperationsAction },
    });

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Bootstrap CFFL Lagos/i }));
    await waitFor(() =>
      expect(runOperationsAction).toHaveBeenCalledWith('bootstrap_cffl_lagos', {
        source: 'admin_settings',
      }),
    );

    const [footballPollButton] = screen.getAllByRole('button', { name: /Poll live scores now/i });
    expect(footballPollButton).toBeDefined();
    fireEvent.click(footballPollButton!);
    await waitFor(() =>
      expect(runOperationsAction).toHaveBeenCalledWith('football_live_sync', {
        source: 'admin_settings',
      }),
    );
  }, 10_000);
});
