import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { FixtureCards } from '../../src/features/fixtures/FixtureCards';
import type { Fixture } from '../../src/types/api';
import { renderApp, testApi } from './test-utils';

const fixture: Fixture = {
  uuid: '00000000-0000-4000-8000-000000000444',
  status: 'scheduled',
  kickoffAt: '2026-08-01 18:30:00',
  timezone: 'UTC',
  roundName: 'Group A',
  matchDay: 1,
  legNumber: null,
  bracketSlot: '',
  competition: { uuid: '00000000-0000-4000-8000-000000000222', name: 'Flag Premier' },
  season: { uuid: '00000000-0000-4000-8000-000000000333', name: '2026' },
  sport: {
    uuid: '00000000-0000-4000-8000-000000000111',
    name: 'Flag Football',
    slug: 'flag-football',
  },
  homeTeam: { uuid: '00000000-0000-4000-8000-000000000555', name: 'Lagos Lightning' },
  awayTeam: { uuid: '00000000-0000-4000-8000-000000000556', name: 'Abuja Rush' },
  venue: { uuid: '00000000-0000-4000-8000-000000000777', name: 'National Stadium' },
  updatedAt: '2026-07-30 10:00:00',
};

describe('Fixture milestone screens', () => {
  it('renders public fixtures with local kickoff details', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/fixtures',
      api: {
        ...testApi,
        getFixtures: () =>
          Promise.resolve({ items: [fixture], page: 1, perPage: 12, total: 1, totalPages: 1 }),
      },
    });

    expect(await screen.findByText('Lagos Lightning vs Abuja Rush')).toBeInTheDocument();
    expect(screen.getByText(/National Stadium/)).toBeInTheDocument();
  });

  it('renders the match centre before scoring begins', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/fixtures/${fixture.uuid}`,
      api: { ...testApi, getFixture: () => Promise.resolve(fixture) },
    });

    expect(
      await screen.findByRole('heading', { name: 'Lagos Lightning vs Abuja Rush' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Scheduled')).not.toHaveLength(0);
    expect(screen.getByText(/Live downs, scoring plays, conversions/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Scoring plays' })).toBeInTheDocument();
  });

  it('embeds an attached YouTube livestream inside the match centre', async () => {
    const recordStreamEngagement = vi.fn(testApi.recordStreamEngagement);
    const recordSponsorEvent = vi.fn(testApi.recordSponsorEvent);
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: `/fixtures/${fixture.uuid}`,
      api: {
        ...testApi,
        recordStreamEngagement,
        recordSponsorEvent,
        getStreamSponsors: () =>
          Promise.resolve([
            {
              uuid: '00000000-0000-4000-8000-000000000991',
              sponsorName: 'Lagos Wolverines',
              campaignName: 'CFFL Matchday',
              logoUrl: 'https://media.test/sponsor.png',
              destinationUrl: 'https://sponsor.test',
              placement: 'pre_match',
              status: 'active',
              impressions: 0,
              clicks: 0,
              startsAt: null,
              endsAt: null,
            },
          ]),
        getFixture: () => Promise.resolve(fixture),
        getLiveMatch: () =>
          Promise.resolve({
            fixture: {
              uuid: fixture.uuid,
              status: 'live',
              homeTeam: fixture.homeTeam,
              awayTeam: fixture.awayTeam,
            },
            score: { home: 18, away: 12 },
            clock: {
              status: 'running',
              period: 2,
              periodLabel: '2Q',
              clockSeconds: 420,
              running: true,
              revision: 4,
            },
            events: [
              {
                uuid: '00000000-0000-4000-8000-000000000888',
                clientEventId: 'possession-1',
                sequenceNumber: 1,
                revision: 4,
                eventType: 'possession_change',
                teamSide: 'home',
                period: 2,
                clockSeconds: 420,
                points: 0,
                description: 'Lagos Lightning possession',
                voided: false,
                createdAt: '2026-08-01 18:40:00',
              },
            ],
            revision: 4,
            idempotent: false,
            event: null,
            provisional: true,
          }),
        getFixtureStream: () =>
          Promise.resolve({
            uuid: '00000000-0000-4000-8000-000000000199',
            provider: 'youtube',
            videoId: 'M7lc1UVf-VE',
            watchUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
            embedUrl: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
            title: 'CFFL Matchday Live',
            status: 'live',
            visibility: 'unlisted',
            embedEnabled: true,
            chatEnabled: false,
            featured: true,
            replayAvailable: false,
            scheduledStart: fixture.kickoffAt,
            lastSyncedAt: null,
            errorMessage: null,
          }),
      },
    });

    const sponsor = await screen.findByRole('link', { name: /Sponsor: Lagos Wolverines/i });
    fireEvent.click(sponsor);
    await waitFor(() => expect(recordSponsorEvent).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /watch broadcast/i }));
    const player = await screen.findByTitle('CFFL Matchday Live');
    expect(player).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1&rel=0',
    );
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /youtube/i })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    );
    expect(
      screen.getByRole('status', { name: /Lagos Lightning 18, Abuja Rush 12.*2Q, 7:00/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /mini player/i }));
    expect(screen.getByLabelText('Compact livestream player')).toBeInTheDocument();
    await waitFor(() =>
      expect(recordStreamEngagement).toHaveBeenCalledWith(
        fixture.uuid,
        expect.objectContaining({ action: 'start', device: 'desktop' }),
      ),
    );
  });

  it('marks stream-enabled fixture cards with a direct watch action', () => {
    renderApp(
      <FixtureCards
        fixtures={[
          {
            ...fixture,
            status: 'live',
            stream: {
              uuid: '00000000-0000-4000-8000-000000000199',
              provider: 'youtube',
              videoId: 'M7lc1UVf-VE',
              watchUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
              embedUrl: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
              title: 'CFFL Matchday Live',
              status: 'live',
              visibility: 'unlisted',
              embedEnabled: true,
              chatEnabled: false,
              featured: true,
              replayAvailable: false,
              scheduledStart: fixture.kickoffAt,
              lastSyncedAt: '2026-08-01 18:30:00',
              errorMessage: null,
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/Watch live/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `/fixtures/${fixture.uuid}`);
  });
});
