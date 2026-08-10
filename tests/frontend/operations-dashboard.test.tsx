import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { OperationsDashboardPage } from '../../src/features/operations/OperationsDashboardPage';
import { adminAuth, guestAuth, renderApp, testApi } from './test-utils';

describe('operations dashboard', () => {
  it('renders dashboard states with redacted logs', async () => {
    renderApp(<OperationsDashboardPage />, { auth: adminAuth });

    expect(await screen.findByText(/Operations Control Room/i)).toBeInTheDocument();
    expect(screen.getByText(/Active live fixtures/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\[redacted\]/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/secret-token/i)).not.toBeInTheDocument();
  });

  it('updates feature flags, maintenance mode and manual operations through protected API methods', async () => {
    const updateOperationsSettings = vi.fn(testApi.updateOperationsSettings);
    const runOperationsAction = vi.fn(testApi.runOperationsAction);
    const exportOperations = vi.fn(testApi.exportOperations);

    renderApp(<OperationsDashboardPage />, {
      auth: adminAuth,
      api: { ...testApi, updateOperationsSettings, runOperationsAction, exportOperations },
    });

    fireEvent.click(await screen.findByLabelText(/Maintenance mode/i));
    await waitFor(() => expect(updateOperationsSettings).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Retry failed jobs/i }));
    await waitFor(() =>
      expect(runOperationsAction).toHaveBeenCalledWith('retry_failed_jobs', {
        source: 'operations_dashboard',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Download diagnostic report/i }));
    await waitFor(() => expect(exportOperations).toHaveBeenCalledWith('diagnostic_report'));
  });

  it('keeps operations route behind the operations capability guard', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, { route: '/operations', auth: guestAuth });

    expect(await screen.findByText(/Sign in to InstaScore/i)).toBeInTheDocument();
  });
});
