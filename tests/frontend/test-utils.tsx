import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ApiClient } from '../../src/api/client';
import { ApiContext } from '../../src/api/context';
import { AuthContext, type AuthContextValue } from '../../src/app/auth-context';
import { ThemeProvider } from '../../src/app/ThemeProvider';
import { PwaProvider } from '../../src/pwa/PwaProvider';

export const testApi: ApiClient = {
  getAuthState: () =>
    Promise.resolve({
      authenticated: false,
      user: null,
      nonce: null,
      theme: null,
    }),
  login: () => Promise.reject(new Error('Not configured')),
  register: () => Promise.reject(new Error('Not configured')),
  forgotPassword: () => Promise.resolve({ message: 'Check your email.' }),
  logout: () => Promise.resolve(),
  setTheme: (theme) => Promise.resolve(theme),
  getSports: () => Promise.resolve([]),
  getAdminSports: () => Promise.resolve([]),
  getCompetitions: () =>
    Promise.resolve({ items: [], page: 1, perPage: 12, total: 0, totalPages: 0 }),
  getCompetition: () => Promise.reject(new Error('Not configured')),
  getTeams: () => Promise.resolve({ items: [], page: 1, perPage: 12, total: 0, totalPages: 0 }),
  getTeam: () => Promise.reject(new Error('Not configured')),
  getPlayers: () => Promise.resolve({ items: [], page: 1, perPage: 12, total: 0, totalPages: 0 }),
  getPlayer: () => Promise.reject(new Error('Not configured')),
  createSport: (input) =>
    Promise.resolve({ uuid: crypto.randomUUID(), slug: input.name, ...input }),
  createCompetition: () => Promise.reject(new Error('Not configured')),
  updateCompetition: () => Promise.reject(new Error('Not configured')),
  changeCompetitionStatus: () => Promise.reject(new Error('Not configured')),
  createSeason: () => Promise.reject(new Error('Not configured')),
  setDefaultSeason: () => Promise.reject(new Error('Not configured')),
  updateSeason: () => Promise.reject(new Error('Not configured')),
  changeSeasonStatus: () => Promise.reject(new Error('Not configured')),
  createCatalogRecord: () => Promise.reject(new Error('Not configured')),
  updateCatalogRecord: () => Promise.reject(new Error('Not configured')),
  changeCatalogStatus: () => Promise.reject(new Error('Not configured')),
  createTeam: () => Promise.reject(new Error('Not configured')),
  createPlayer: () => Promise.reject(new Error('Not configured')),
  createVenue: () => Promise.reject(new Error('Not configured')),
  createOfficial: () => Promise.reject(new Error('Not configured')),
  getVenues: () => Promise.resolve([]),
  getOfficials: () => Promise.resolve([]),
  createRegistration: () => Promise.reject(new Error('Not configured')),
  updateRegistration: () => Promise.reject(new Error('Not configured')),
  updateAdminEntity: () => Promise.reject(new Error('Not configured')),
  changeAdminEntityStatus: () => Promise.reject(new Error('Not configured')),
  uploadMedia: () => Promise.reject(new Error('Not configured')),
  getAccounts: () => Promise.resolve([]),
  createAccount: () => Promise.reject(new Error('Not configured')),
  previewRegistrationImport: () => Promise.resolve({ valid: 0, errors: [], preview: [] }),
  commitRegistrationImport: () => Promise.reject(new Error('Not configured')),
  getRegistrationImportTemplate: () =>
    Promise.resolve({
      filename: 'instascore-registration-import-template.csv',
      headers: [],
    }),
  getFixtures: () => Promise.resolve({ items: [], page: 1, perPage: 12, total: 0, totalPages: 0 }),
  getAdminFixtures: () =>
    Promise.resolve({ items: [], page: 1, perPage: 50, total: 0, totalPages: 0 }),
  getResults: () => Promise.resolve({ items: [], page: 1, perPage: 12, total: 0, totalPages: 0 }),
  getFixture: () => Promise.reject(new Error('Not configured')),
  createFixture: () => Promise.reject(new Error('Not configured')),
  updateFixture: () => Promise.reject(new Error('Not configured')),
  updateFixtureStatus: () => Promise.reject(new Error('Not configured')),
  getLiveMatch: () => Promise.reject(new Error('Not configured')),
  getLiveMatchStreamUrl: (uuid) => `/wp-json/instascore/v1/fixtures/${uuid}/live/stream`,
  claimFixture: () => Promise.reject(new Error('Not configured')),
  releaseFixture: () => Promise.reject(new Error('Not configured')),
  controlClock: () => Promise.reject(new Error('Not configured')),
  appendMatchEvent: () => Promise.reject(new Error('Not configured')),
  voidMatchEvent: () => Promise.reject(new Error('Not configured')),
  completeFixture: () => Promise.reject(new Error('Not configured')),
  confirmResult: () => Promise.reject(new Error('Not configured')),
  getStandings: () => Promise.resolve([]),
  getTeamStatistics: () => Promise.resolve([]),
  getPlayerLeaders: () => Promise.resolve([]),
  createDisciplineRecord: () => Promise.reject(new Error('Not configured')),
  rebuildStandings: () => Promise.reject(new Error('Not configured')),
  getNotificationPreferences: () =>
    Promise.resolve({
      categories: ['match_starting', 'score_change'],
      preferences: [
        {
          category: 'match_starting',
          enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          timezone: 'Africa/Lagos',
        },
      ],
      disabled: false,
      workerUrl: '/OneSignalSDKWorker.js',
    }),
  saveNotificationPreferences: (preferences) =>
    Promise.resolve({
      categories: preferences.map((preference) => preference.category),
      preferences,
      disabled: false,
      workerUrl: '/OneSignalSDKWorker.js',
    }),
  syncNotificationSubscription: () => Promise.resolve({ synced: true }),
  followNotificationTarget: () => Promise.resolve({ followed: true }),
  adminTestNotification: () => Promise.resolve({ status: 'disabled' }),
  getNotificationAdminStatus: () =>
    Promise.resolve({
      configured: true,
      disabled: false,
      subscriptions: 0,
      workerNextAt: null,
      remindersNextAt: null,
      counts: { queued: 0, processing: 0, retrying: 0, sent: 0, suppressed: 0, failed: 0 },
      recent: [],
    }),
  processNotificationQueue: () =>
    Promise.resolve({ sent: 0, suppressed: 0, retrying: 0, failed: 0 }),
  getFootballProviderHealth: () =>
    Promise.resolve({
      provider: 'approved_football_provider',
      sport: 'football',
      configured: false,
      baseUrl: 'https://api-football.instascore.local/v1',
      secretExposed: false,
      schedules: {
        live: 'every_30_seconds_for_live_fixtures',
        nearStart: 'every_5_minutes_within_2_hours',
        future: 'hourly',
        completed: 'twice_daily_until_confirmed',
      },
      conflicts: [],
      recentSyncLogs: [],
    }),
  syncFootballProvider: () =>
    Promise.resolve({ status: 'succeeded', dryRun: true, count: 0, preview: [] }),
  getProviderHealth: (sport) =>
    Promise.resolve({
      provider:
        sport === 'basketball' ? 'approved_basketball_provider' : 'approved_football_provider',
      sport,
      configured: false,
      baseUrl:
        sport === 'basketball'
          ? 'https://api-basketball.instascore.local/v1'
          : 'https://api-football.instascore.local/v1',
      secretExposed: false,
      schedules: {
        live: 'every_30_seconds_for_live_fixtures',
        nearStart: 'every_5_minutes_within_2_hours',
        future: 'hourly',
        completed: 'twice_daily_until_confirmed',
      },
      conflicts: [],
      recentSyncLogs: [],
    }),
  syncProvider: () => Promise.resolve({ status: 'succeeded', dryRun: true, count: 0, preview: [] }),
  getFootballLive: () => Promise.resolve([]),
  getProviderMatches: () => Promise.resolve([]),
  getFootballMatch: () => Promise.reject(new Error('Football match not configured in test.')),
  getBasketballLive: () =>
    Promise.resolve([
      {
        providerId: 'game-1',
        homeTeamName: 'Lagos Hoops',
        awayTeamName: 'Abuja Nets',
        homeScore: 104,
        awayScore: 101,
        status: 'live',
        sport: 'basketball',
        sportState: {
          period: 5,
          periodLabel: 'OT',
          overtimePeriods: 1,
          scoreReconciled: true,
          periodScores: [
            { label: 'Q1', home: 20, away: 21 },
            { label: 'Q2', home: 25, away: 24 },
            { label: 'Q3', home: 22, away: 20 },
            { label: 'Q4', home: 25, away: 27 },
            { label: 'OT', home: 12, away: 9 },
          ],
        },
      },
    ]),
  getNews: () => Promise.resolve([]),
  sendContactMessage: () => Promise.resolve({ message: 'Thanks—your message has been sent.' }),
  getRssDashboard: () =>
    Promise.resolve({
      sources: [],
      settings: { interval: 'hourly', batchSize: 10, postStatus: 'publish' },
      lastRun: null,
      nextRunAt: null,
    }),
  createRssSource: () => Promise.reject(new Error('Not configured')),
  updateRssSource: () => Promise.reject(new Error('Not configured')),
  deleteRssSource: () => Promise.resolve({ deleted: true }),
  updateRssSettings: (settings) => Promise.resolve(settings),
  syncRss: () => Promise.resolve({ sources: 0, imported: 0, duplicates: 0, failed: 0 }),
  getFavourites: () => Promise.resolve([]),
  followFavourite: ({ entityType, entityUuid }) =>
    Promise.resolve({
      uuid: '00000000-0000-4000-8000-000000000011',
      entity_type: entityType,
      entity_uuid: entityUuid,
      status: 'active',
      source: 'server',
    }),
  unfollowFavourite: () => Promise.resolve({ unfollowed: true }),
  mergeAnonymousFavourites: (favourites) => Promise.resolve({ favourites }),
  getUserPreferences: () =>
    Promise.resolve({
      timezone: 'Africa/Lagos',
      language: 'en',
      preferredSports: ['flag-football', 'football', 'basketball'],
    }),
  saveUserPreferences: (input) => Promise.resolve(input),
  getPersonalFeed: () =>
    Promise.resolve({
      favourites: [],
      items: [],
      suggestions: [{ type: 'team', label: 'Follow a team to personalise your scores.' }],
    }),
  search: () => Promise.resolve([]),
  getAlertHistory: () => Promise.resolve([]),
  getFantasyGames: () =>
    Promise.resolve([
      {
        uuid: '00000000-0000-4000-8000-000000000120',
        name: 'InstaScore Fantasy',
        slug: 'instascore-fantasy',
        description: 'Build a budget-safe squad.',
        status: 'open',
        budgetCents: 100000,
        squadSize: 2,
        startingSize: 1,
        benchSize: 1,
        maxPlayersPerTeam: 1,
        sport: {
          uuid: '00000000-0000-4000-8000-000000000130',
          name: 'Flag football',
          slug: 'flag-football',
        },
      },
    ]),
  getFantasyGame: () =>
    Promise.resolve({
      uuid: '00000000-0000-4000-8000-000000000120',
      name: 'InstaScore Fantasy',
      slug: 'instascore-fantasy',
      description: 'Build a budget-safe squad.',
      status: 'open',
      budgetCents: 100000,
      squadSize: 2,
      startingSize: 1,
      benchSize: 1,
      maxPlayersPerTeam: 1,
      sport: {
        uuid: '00000000-0000-4000-8000-000000000130',
        name: 'Flag football',
        slug: 'flag-football',
      },
      positions: [],
    }),
  getFantasyPlayers: () =>
    Promise.resolve([
      {
        uuid: '00000000-0000-4000-8000-000000000121',
        priceCents: 45000,
        status: 'available',
        position: { code: 'QB', name: 'Quarterback' },
        player: { uuid: '00000000-0000-4000-8000-000000000131', name: 'Ada Touchdown' },
        team: { uuid: '00000000-0000-4000-8000-000000000141', name: 'Lagos Lightning' },
      },
    ]),
  getFantasySquad: () =>
    Promise.resolve({
      game: {
        uuid: '00000000-0000-4000-8000-000000000120',
        name: 'InstaScore Fantasy',
        slug: 'instascore-fantasy',
        description: 'Build a budget-safe squad.',
        status: 'open',
        budgetCents: 100000,
        squadSize: 2,
        startingSize: 1,
        benchSize: 1,
        maxPlayersPerTeam: 1,
        sport: {
          uuid: '00000000-0000-4000-8000-000000000130',
          name: 'Flag football',
          slug: 'flag-football',
        },
        positions: [],
      },
      gameweek: {
        uuid: '00000000-0000-4000-8000-000000000122',
        name: 'Gameweek 1',
        sequenceNumber: 1,
        deadlineAt: '2026-08-01 12:00:00',
        locked: false,
      },
      squad: null,
    }),
  saveFantasySquad: (_uuid, input) =>
    Promise.resolve({
      game: {
        uuid: '00000000-0000-4000-8000-000000000120',
        name: 'InstaScore Fantasy',
        slug: 'instascore-fantasy',
        description: 'Build a budget-safe squad.',
        status: 'open',
        budgetCents: 100000,
        squadSize: 2,
        startingSize: 1,
        benchSize: 1,
        maxPlayersPerTeam: 1,
        sport: {
          uuid: '00000000-0000-4000-8000-000000000130',
          name: 'Flag football',
          slug: 'flag-football',
        },
      },
      gameweek: {
        uuid: '00000000-0000-4000-8000-000000000122',
        name: 'Gameweek 1',
        sequenceNumber: 1,
        deadlineAt: '2026-08-01 12:00:00',
        locked: false,
      },
      squad: {
        uuid: '00000000-0000-4000-8000-000000000123',
        name: input.name,
        status: 'draft',
        revision: 1,
        totalCostCents: 45000,
        remainingBudget: 55000,
        players: input.players,
      },
    }),
  submitFantasySquad: (_uuid, input) =>
    Promise.resolve({
      game: {
        uuid: '00000000-0000-4000-8000-000000000120',
        name: 'InstaScore Fantasy',
        slug: 'instascore-fantasy',
        description: 'Build a budget-safe squad.',
        status: 'open',
        budgetCents: 100000,
        squadSize: 2,
        startingSize: 1,
        benchSize: 1,
        maxPlayersPerTeam: 1,
        sport: {
          uuid: '00000000-0000-4000-8000-000000000130',
          name: 'Flag football',
          slug: 'flag-football',
        },
      },
      gameweek: {
        uuid: '00000000-0000-4000-8000-000000000122',
        name: 'Gameweek 1',
        sequenceNumber: 1,
        deadlineAt: '2026-08-01 12:00:00',
        locked: false,
      },
      squad: {
        uuid: '00000000-0000-4000-8000-000000000123',
        name: input.name,
        status: 'submitted',
        revision: 1,
        totalCostCents: 45000,
        remainingBudget: 55000,
        players: input.players,
      },
    }),
  createFantasyGame: (input) =>
    Promise.resolve({
      uuid: '00000000-0000-4000-8000-000000000120',
      name: String(input.name),
      slug: 'instascore-fantasy',
      description: '',
      status: 'draft',
      budgetCents: Number(input.budgetCents),
      squadSize: 15,
      startingSize: 7,
      benchSize: 8,
      maxPlayersPerTeam: 3,
      sport: { uuid: '', name: '', slug: '' },
    }),
  getFantasyPoints: () =>
    Promise.resolve([
      {
        uuid: '00000000-0000-4000-8000-000000000160',
        playerName: 'Ada Touchdown',
        points: 12,
        status: 'provisional',
        revision: 2,
        breakdown: { touchdown: 6, captain: true },
        updatedAt: '2026-08-01 12:10:00',
      },
    ]),
  getFantasyLiveTracker: () =>
    Promise.resolve([{ playerName: 'Ada Touchdown', points: 12, status: 'provisional' }]),
  makeFantasyTransfer: () =>
    Promise.resolve({
      uuid: '00000000-0000-4000-8000-000000000161',
      costPoints: 0,
      freeTransferUsed: true,
      status: 'completed',
    }),
  createFantasyLeague: () =>
    Promise.resolve({
      uuid: '00000000-0000-4000-8000-000000000150',
      name: 'Lagos Super League',
      visibility: 'private',
      inviteCode: 'ABC123',
      isMember: true,
      status: 'active',
    }),
  getFantasyLeague: () =>
    Promise.resolve({
      uuid: '00000000-0000-4000-8000-000000000150',
      name: 'Lagos Super League',
      visibility: 'private',
      inviteCode: 'ABC123',
      isMember: true,
      status: 'active',
      table: [
        {
          rank: 1,
          previousRank: 3,
          movement: 2,
          userName: 'League Admin',
          points: 88,
        },
      ],
    }),
  createFantasyRule: () => Promise.resolve({ created: true }),
  overrideFantasyPoints: () => Promise.resolve({ action: 'admin_override' }),
  getOperationsDashboard: () =>
    Promise.resolve({
      summary: {
        competitions: 4,
        activeLiveFixtures: 2,
        resultsAwaitingConfirmation: 1,
        providerFailures: 3,
        notificationFailures: 1,
        offlineSyncConflicts: 2,
        eventConflicts: 1,
        openAlerts: 5,
      },
      settings: {
        maintenanceMode: false,
        emergencyNotificationsDisabled: false,
        dataRetentionDays: 365,
        featureFlags: { providerSync: true, fantasy: true, pushNotifications: true },
        providerSettings: {
          football: {
            providerName: 'approved_football_provider',
            baseUrl: 'https://api-football.instascore.local/v1',
            apiKeyConfigured: false,
            pollingEnabled: false,
            liveIntervalSeconds: 60,
          },
          basketball: {
            providerName: 'approved_basketball_provider',
            baseUrl: 'https://api-basketball.instascore.local/v1',
            apiKeyConfigured: false,
            pollingEnabled: false,
            liveIntervalSeconds: 60,
          },
        },
      },
      logs: {
        providerSync: [
          {
            status: 'failed',
            provider_name: 'approved_football_provider',
            api_key: '[redacted]',
          },
        ],
        notificationDelivery: [{ status: 'failed', authorization: '[redacted]' }],
        offlineSyncConflicts: [{ sync_state: 'conflict', fixture_uuid: 'fixture-1' }],
        eventConflicts: [{ status: 'conflict', client_event_id: 'client-1' }],
        audit: [{ action: 'fixture_status_changed', payload: '[redacted]' }],
        operationsActions: [],
      },
      healthReport: {
        pluginVersion: '0.14.0',
        dbVersion: 12,
        secrets: 'redacted',
      },
    }),
  updateOperationsSettings: (input) =>
    Promise.resolve({
      maintenanceMode: Boolean(input.maintenanceMode),
      emergencyNotificationsDisabled: Boolean(input.emergencyNotificationsDisabled),
      dataRetentionDays: input.dataRetentionDays ?? 365,
      featureFlags: input.featureFlags ?? { providerSync: true, fantasy: true },
      providerSettings: input.providerSettings ?? {
        football: {
          providerName: 'approved_football_provider',
          baseUrl: 'https://api-football.instascore.local/v1',
          apiKeyConfigured: false,
          pollingEnabled: false,
          liveIntervalSeconds: 60,
        },
        basketball: {
          providerName: 'approved_basketball_provider',
          baseUrl: 'https://api-basketball.instascore.local/v1',
          apiKeyConfigured: false,
          pollingEnabled: false,
          liveIntervalSeconds: 60,
        },
      },
    }),
  runOperationsAction: (action) =>
    Promise.resolve({
      status: 'queued',
      action,
      message: 'Operation accepted for the existing domain worker/command pipeline.',
    }),
  exportOperations: () =>
    Promise.resolve({
      filename: 'instascore-diagnostic-report.csv',
      content: '"section","metric","value"\n"summary","providerFailures","3"\n',
      redacted: true,
    }),
};

export const guestAuth: AuthContextValue = {
  state: {
    authenticated: false,
    user: null,
    nonce: null,
    theme: null,
  },
  isLoading: false,
  isError: false,
};

export const adminAuth: AuthContextValue = {
  state: {
    authenticated: true,
    nonce: 'test-nonce',
    theme: 'system',
    user: {
      uuid: '00000000-0000-4000-8000-000000000001',
      displayName: 'League Admin',
      roles: ['administrator'],
      capabilities: {
        accessAdmin: true,
        accessOperations: true,
        manageLeagues: true,
        manageCompetitions: true,
        manageTeams: true,
        managePlayers: true,
        manageVenues: true,
        manageOfficials: true,
        manageFixtures: true,
        manageScoring: true,
        confirmResults: true,
      },
    },
  },
  isLoading: false,
  isError: false,
};

export function renderApp(
  element: ReactElement,
  {
    route = '/',
    auth = guestAuth,
    api = testApi,
  }: {
    route?: string;
    auth?: AuthContextValue;
    api?: ApiClient;
  } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={api}>
        <AuthContext.Provider value={auth}>
          <PwaProvider
            settings={{
              apiBase: '/wp-json/instascore/v1',
              appBase: '',
              loginUrl: '/wp-login.php',
              nonce: null,
            }}
          >
            <ThemeProvider>
              <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
            </ThemeProvider>
          </PwaProvider>
        </AuthContext.Provider>
      </ApiContext.Provider>
    </QueryClientProvider>,
  );
}
