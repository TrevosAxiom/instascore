import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { adminAuth, renderApp } from './test-utils';

describe('Route guards', () => {
  it('redirects a guest from the administration route to login', () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, { route: '/admin' });
    expect(screen.getByRole('heading', { name: 'Sign in to InstaScore' })).toBeInTheDocument();
  });

  it('allows an authorized administrator into the protected shell', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/admin',
      auth: adminAuth,
    });
    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
  });
});
