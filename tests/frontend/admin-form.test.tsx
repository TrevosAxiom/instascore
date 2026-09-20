import { fireEvent, screen, waitFor } from '@testing-library/react';
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

  it('generates a season schedule from the competition format workspace', async () => {
    const generateCompetitionFixtures = vi.fn().mockResolvedValue({
      created: 12,
      rounds: 6,
      teams: 4,
    });
    const competition = {
      uuid: '00000000-0000-4000-8000-000000000101',
      name: 'CFFL Lagos',
      slug: 'cffl-lagos',
      type: 'league' as const,
      description: '',
      countryCode: 'NG',
      sport: {
        uuid: '00000000-0000-4000-8000-000000000001',
        name: 'Flag Football',
        slug: 'flag-football',
      },
      rules: { default_season_uuid: '00000000-0000-4000-8000-000000000201' },
      status: 'active',
      updatedAt: '2026-01-01',
      seasons: [
        {
          uuid: '00000000-0000-4000-8000-000000000201',
          name: '2026',
          slug: '2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active',
        },
      ],
    };
    renderApp(
      <Routes>
        <Route path="/admin" element={<AdminCompetitionsPage />} />
      </Routes>,
      {
        route: '/admin',
        auth: adminAuth,
        api: {
          ...testApi,
          getCompetitions: vi.fn().mockResolvedValue({
            items: [competition],
            page: 1,
            perPage: 50,
            total: 1,
            totalPages: 1,
          }),
          getCompetition: vi.fn().mockResolvedValue(competition),
          getCompetitionStructure: vi.fn().mockResolvedValue({
            competitionUuid: competition.uuid,
            seasonUuid: competition.seasons[0].uuid,
            stages: [],
            fixtures: [],
          }),
          generateCompetitionFixtures,
        },
      },
    );

    fireEvent.click(await screen.findByRole('tab', { name: /format & schedule/i }));
    const generateButton = await screen.findByRole('button', { name: /generate league fixtures/i });
    await waitFor(() => expect(generateButton).toBeEnabled());
    fireEvent.click(generateButton);
    expect(
      await screen.findByText(/Created 12 draft fixtures across 6 rounds/i),
    ).toBeInTheDocument();
    expect(generateCompetitionFixtures).toHaveBeenCalledWith(
      competition.uuid,
      expect.objectContaining({ seasonUuid: competition.seasons[0].uuid }),
    );
  });
});
