import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import type { LiveMatchState } from '../../src/types/api';
import { adminAuth, renderApp, testApi } from './test-utils';

const liveState: LiveMatchState = {
  fixture: {
    uuid: '00000000-0000-4000-8000-000000000555',
    status: 'live',
    homeTeam: { uuid: 'home', name: 'Lagos Lightning' },
    awayTeam: { uuid: 'away', name: 'Abuja Rush' },
  },
  score: { home: 12, away: 6 },
  clock: {
    status: 'running',
    period: 2,
    periodLabel: '2Q',
    clockSeconds: 420,
    running: true,
    revision: 3,
  },
  events: [
    {
      uuid: '00000000-0000-4000-8000-000000000777',
      clientEventId: 'client-1',
      sequenceNumber: 1,
      revision: 1,
      eventType: 'touchdown',
      teamSide: 'home',
      period: 1,
      clockSeconds: 120,
      points: 6,
      description: '',
      voided: false,
      createdAt: '2026-08-01 18:00:00',
    },
  ],
  revision: 3,
  idempotent: false,
  event: null,
  provisional: true,
};

describe('Live scoring milestone UI', () => {
  it('opens the football scores tab from the URL and renders API-Football matches', async () => {
    const getFootballLive = vi.fn(() =>
      Promise.resolve([
        {
          providerId: '1508488',
          competitionProviderId: '254',
          competitionName: 'NWSL Women',
          homeTeamName: 'Kansas City W',
          awayTeamName: 'Angel City W',
          homeTeamLogoUrl: 'https://media.test/kansas-city.png',
          awayTeamLogoUrl: 'https://media.test/angel-city.png',
          homeScore: 1,
          awayScore: 0,
          kickoffAt: '2026-08-01T22:30:00+00:00',
          status: 'live' as const,
        },
      ]),
    );

    renderApp(<AppRoutes loginUrl="/login" />, {
      route: '/scores?sport=football',
      api: { ...testApi, getFootballLive },
    });

    expect(await screen.findByText('Kansas City W')).toBeInTheDocument();
    expect(screen.getByText('Angel City W')).toBeInTheDocument();
    expect(screen.getByText('NWSL Women')).toBeInTheDocument();
    expect(getFootballLive).toHaveBeenCalled();
  });

  it('renders provider team logos and match information on the football detail page', async () => {
    renderApp(<AppRoutes loginUrl="/login" />, {
      route: '/football/matches/1508488',
      api: {
        ...testApi,
        getFootballMatch: () =>
          Promise.resolve({
            match: {
              providerId: '1508488',
              competitionProviderId: '254',
              competitionName: 'NWSL Women',
              homeTeamName: 'Kansas City W',
              awayTeamName: 'Angel City W',
              homeTeamLogoUrl: 'https://media.test/kansas-city.png',
              awayTeamLogoUrl: 'https://media.test/angel-city.png',
              homeScore: 1,
              awayScore: 0,
              kickoffAt: '2026-08-01T22:30:00+00:00',
              status: 'live',
              statusShort: '1H',
              elapsed: 13,
              round: 'Regular Season - 18',
              venueName: 'CPKC Stadium',
            },
            events: [],
            lineups: [],
            statistics: [],
            standings: [],
            updatedAt: '2026-08-01T22:43:00+00:00',
          }),
      },
    });

    expect(await screen.findByRole('img', { name: 'Kansas City W logo' })).toHaveAttribute(
      'src',
      'https://media.test/kansas-city.png',
    );
    expect(screen.getByRole('img', { name: 'Angel City W logo' })).toBeInTheDocument();
    expect(screen.getAllByText(/CPKC Stadium/i)).toHaveLength(2);
    expect(screen.getByText(/Regular Season - 18/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lineups' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Statistics' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Table' })).toBeInTheDocument();
  });

  it('renders public scoreboard and timeline from polling state', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/fixtures/${liveState.fixture.uuid}`,
      api: {
        ...testApi,
        getFixture: () =>
          Promise.resolve({
            uuid: liveState.fixture.uuid,
            status: 'live',
            kickoffAt: '2026-08-01 18:00:00',
            timezone: 'UTC',
            roundName: 'Final',
            matchDay: 1,
            legNumber: null,
            bracketSlot: '',
            competition: { uuid: 'c', name: 'Flag Premier' },
            season: { uuid: 's', name: '2026' },
            sport: { uuid: 'sport', name: 'Flag Football', slug: 'flag-football' },
            homeTeam: liveState.fixture.homeTeam,
            awayTeam: liveState.fixture.awayTeam,
            venue: null,
            updatedAt: '2026-08-01 18:00:00',
          }),
        getLiveMatch: () => Promise.resolve(liveState),
      },
    });

    expect(await screen.findByText('Lagos Lightning')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /Lagos Lightning 12, Abuja Rush 6/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Touchdown')).toBeInTheDocument();
  });

  it('submits optimistic scorekeeper event controls with expected revision', async () => {
    const append = vi.fn(() =>
      Promise.resolve({ ...liveState, score: { home: 18, away: 6 }, revision: 4 }),
    );
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/operations/fixtures/${liveState.fixture.uuid}`,
      auth: adminAuth,
      api: { ...testApi, getLiveMatch: () => Promise.resolve(liveState), appendMatchEvent: append },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Home TD' }));
    await screen.findByText('18');
    expect(append).toHaveBeenCalledWith(
      liveState.fixture.uuid,
      expect.objectContaining({ eventType: 'touchdown', teamSide: 'home', expectedRevision: 3 }),
    );
  });
});
