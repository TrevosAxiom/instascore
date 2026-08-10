import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import type { ApiClient } from '../../src/api/client';
import type { Fixture, LiveMatchState } from '../../src/types/api';
import { renderApp, testApi } from './test-utils';

const fixture: Fixture = {
  uuid: '00000000-0000-4000-8000-000000000501',
  status: 'live',
  kickoffAt: '2026-08-01 12:00:00',
  timezone: 'Africa/Lagos',
  roundName: 'Week 1',
  matchDay: 1,
  legNumber: null,
  bracketSlot: '',
  competition: { uuid: '00000000-0000-4000-8000-000000000601', name: 'Lagos Flag League' },
  season: { uuid: '00000000-0000-4000-8000-000000000602', name: '2026' },
  sport: {
    uuid: '00000000-0000-4000-8000-000000000603',
    name: 'Flag football',
    slug: 'flag-football',
  },
  homeTeam: { uuid: 'home', name: 'Lagos Lightning' },
  awayTeam: { uuid: 'away', name: 'Abuja Raptors' },
  venue: { uuid: 'venue', name: 'National Stadium' },
  updatedAt: '2026-08-01 12:10:00',
};

const liveState: LiveMatchState = {
  fixture: {
    uuid: fixture.uuid,
    status: 'live',
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  },
  score: { home: 14, away: 7 },
  clock: {
    status: 'running',
    period: 2,
    periodLabel: 'Q2',
    clockSeconds: 480,
    running: true,
    revision: 3,
  },
  events: [],
  revision: 3,
  idempotent: false,
  event: null,
  provisional: true,
};

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners = new Map<string, (event: MessageEvent<string>) => void>();
  onerror: null | (() => void) = null;

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string) {
    this.listeners.delete(type);
  }

  close = vi.fn();

  emit(type: string, data: unknown) {
    this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

function milestoneApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    ...testApi,
    getFixture: () => Promise.resolve(fixture),
    getLiveMatch: () => Promise.resolve(liveState),
    getLiveMatchStreamUrl: (uuid) => `/wp-json/instascore/v1/fixtures/${uuid}/live/stream`,
    getCompetition: () =>
      Promise.resolve({
        uuid: fixture.competition.uuid,
        name: 'Lagos Flag League',
        slug: 'lagos-flag-league',
        type: 'league',
        description: 'Friday night lights for Lagos flag football.',
        countryCode: 'NG',
        sport: fixture.sport,
        rules: { portalAccent: '#f7c948' },
        status: 'active',
        updatedAt: '2026-08-01 12:00:00',
        seasons: [],
      }),
    getFixtures: () =>
      Promise.resolve({ items: [fixture], page: 1, perPage: 6, total: 1, totalPages: 1 }),
    getStandings: () =>
      Promise.resolve([
        {
          uuid: 'standing-1',
          position: 1,
          team: fixture.homeTeam,
          played: 1,
          wins: 1,
          draws: 0,
          losses: 0,
          points: 3,
          pointsFor: 14,
          pointsAgainst: 7,
          pointDifference: 7,
          form: 'W',
          rebuildHash: 'hash',
          tiebreakerOrder: ['points'],
        },
      ]),
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeEventSource.instances = [];
});

describe('Milestone 17 experience upgrades', () => {
  it('uses SSE for the live match centre and keeps polling as a fallback source', async () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/fixtures/${fixture.uuid}`,
      api: milestoneApi(),
    });

    expect(
      await screen.findByRole('heading', { name: /Lagos Lightning vs Abuja Raptors/i }),
    ).toBeInTheDocument();
    expect(FakeEventSource.instances[0]?.url).toContain('/live/stream');

    act(() => {
      FakeEventSource.instances[0]?.emit('live-state', liveState);
    });

    expect(await screen.findByText(/Live updates connected/i)).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('renders embeddable widgets without the full app navigation chrome', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/embed/fixture/${fixture.uuid}`,
      api: milestoneApi(),
    });

    expect(await screen.findByText(/Fixture widget/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /Lagos Lightning vs Abuja Raptors/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: /Primary navigation/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a white-label competition portal with fixtures, table and embed link', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/portal/${fixture.competition.uuid}`,
      api: milestoneApi(),
    });

    expect(await screen.findByRole('heading', { name: 'Lagos Flag League' })).toBeInTheDocument();
    expect(screen.getByText(/Upcoming fixtures/i)).toBeInTheDocument();
    expect(screen.getByText(/League table/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Embed table/i })).toHaveAttribute(
      'href',
      `/embed/table/${fixture.competition.uuid}`,
    );
  });
});
