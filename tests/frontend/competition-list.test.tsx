import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { CompetitionDirectoryPage } from '../../src/features/competitions/CompetitionDirectoryPage';
import { renderApp, testApi } from './test-utils';

describe('Public competition directory', () => {
  it('renders competitions returned by the paginated public endpoint', async () => {
    renderApp(
      <Routes>
        <Route path="/competitions" element={<CompetitionDirectoryPage />} />
      </Routes>,
      {
        route: '/competitions',
        api: {
          ...testApi,
          getCompetitions: vi.fn().mockResolvedValue({
            items: [
              {
                uuid: '00000000-0000-4000-8000-000000000010',
                name: 'CFFL Championship',
                slug: 'cffl-championship',
                type: 'league',
                description: 'Nigeria flag football.',
                countryCode: 'NG',
                sport: {
                  uuid: '00000000-0000-4000-8000-000000000001',
                  name: 'Flag Football',
                  slug: 'flag-football',
                },
                rules: {},
                status: 'active',
                updatedAt: '2026-07-30 10:00:00',
              },
            ],
            page: 1,
            perPage: 12,
            total: 1,
            totalPages: 1,
          }),
        },
      },
    );
    expect(await screen.findByText('CFFL Championship')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Flag Football' })).toBeInTheDocument();
  });
});
