import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AdminCompetitionsPage } from '../../src/features/competitions/AdminCompetitionsPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('Competition administration form', () => {
  it('shows client-side validation before creating a competition', async () => {
    const createCompetition = vi.fn();
    renderApp(
      <Routes>
        <Route path="/admin" element={<AdminCompetitionsPage />} />
      </Routes>,
      {
        route: '/admin',
        auth: adminAuth,
        api: {
          ...testApi,
          getSports: vi.fn().mockResolvedValue([
            {
              uuid: '00000000-0000-4000-8000-000000000001',
              name: 'Flag Football',
              slug: 'flag-football',
            },
          ]),
          createCompetition,
        },
      },
    );

    fireEvent.click(await screen.findByRole('tab', { name: /competitions & rules/i }));
    fireEvent.click(await screen.findByRole('button', { name: /create competition/i }));
    fireEvent.click(await screen.findByRole('button', { name: /create competition/i }));

    expect(await screen.findByLabelText('Competition name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(createCompetition).not.toHaveBeenCalled();
  });
});
