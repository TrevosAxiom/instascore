import type {
  ApiEnvelope,
  AlertHistoryItem,
  AuthState,
  BasketballLiveGame,
  FootballProviderLiveGame,
  FootballMatchDetails,
  BootstrapSettings,
  Competition,
  CompetitionPage,
  CsvImportPreview,
  Fixture,
  FixtureMutationResult,
  Favourite,
  FavouriteEntityType,
  FantasyGame,
  FantasyLeague,
  FantasyLiveRow,
  FantasyPlayer,
  FantasyPointBreakdown,
  FantasySquadEntry,
  FantasySquadState,
  FantasyTransferResult,
  LiveMatchState,
  MediaUpload,
  NotificationPreferencesResponse,
  NotificationAdminStatus,
  NewsItem,
  RssDashboard,
  RssSettings,
  RssSource,
  RssSyncResult,
  OperationsActionResult,
  OperationsDashboard,
  OperationsExport,
  OperationsSettings,
  OperationalAccount,
  ProviderHealth,
  ProviderUpcomingMatch,
  ProviderSyncResult,
  Paginated,
  PersonalFeed,
  PlayerLeader,
  Player,
  StandingRow,
  Sport,
  Team,
  TeamStatistic,
  ThemePreference,
  SearchResult,
  UserPreferences,
  Venue,
  Official,
} from '../types/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'instascore_request_failed',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
  getAuthState: () => Promise<AuthState>;
  login: (input: { email: string; password: string; remember: boolean }) => Promise<AuthState>;
  register: (input: { displayName: string; email: string; password: string }) => Promise<AuthState>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  logout: () => Promise<unknown>;
  setTheme: (theme: ThemePreference) => Promise<ThemePreference>;
  getSports: () => Promise<Sport[]>;
  getAdminSports: () => Promise<Sport[]>;
  getCompetitions: (query?: URLSearchParams) => Promise<CompetitionPage>;
  getCompetition: (uuid: string, query?: URLSearchParams) => Promise<Competition>;
  createSport: (input: { name: string }) => Promise<Sport>;
  createCompetition: (input: Record<string, unknown>) => Promise<Competition>;
  updateCompetition: (uuid: string, input: Record<string, unknown>) => Promise<Competition>;
  changeCompetitionStatus: (uuid: string, action: 'archive' | 'restore') => Promise<unknown>;
  createSeason: (competitionUuid: string, input: Record<string, unknown>) => Promise<unknown>;
  setDefaultSeason: (competitionUuid: string, seasonUuid: string) => Promise<unknown>;
  updateSeason: (uuid: string, input: Record<string, unknown>) => Promise<unknown>;
  changeSeasonStatus: (uuid: string, action: 'archive' | 'restore') => Promise<unknown>;
  createCatalogRecord: (
    entity: 'stages' | 'groups',
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  updateCatalogRecord: (
    entity: 'sports' | 'stages' | 'groups',
    uuid: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  changeCatalogStatus: (
    entity: 'sports' | 'stages' | 'groups',
    uuid: string,
    action: 'archive' | 'restore',
  ) => Promise<unknown>;
  getTeams: (query?: URLSearchParams) => Promise<Paginated<Team>>;
  getTeam: (uuid: string) => Promise<Team>;
  getPlayers: (query?: URLSearchParams) => Promise<Paginated<Player>>;
  getPlayer: (uuid: string) => Promise<Player>;
  createTeam: (input: Record<string, unknown>) => Promise<Team>;
  createPlayer: (input: Record<string, unknown>) => Promise<Player>;
  createVenue: (input: Record<string, unknown>) => Promise<unknown>;
  createOfficial: (input: Record<string, unknown>) => Promise<unknown>;
  getVenues: () => Promise<Venue[]>;
  getOfficials: () => Promise<Official[]>;
  createRegistration: (input: Record<string, unknown>) => Promise<unknown>;
  updateRegistration: (uuid: string, input: Record<string, unknown>) => Promise<unknown>;
  updateAdminEntity: (
    entity: 'teams' | 'players' | 'venues' | 'officials',
    uuid: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  changeAdminEntityStatus: (
    entity: 'teams' | 'players' | 'venues' | 'officials',
    uuid: string,
    action: 'archive' | 'restore',
  ) => Promise<unknown>;
  uploadMedia: (file: File) => Promise<MediaUpload>;
  getAccounts: () => Promise<OperationalAccount[]>;
  createAccount: (input: Record<string, unknown>) => Promise<OperationalAccount>;
  previewRegistrationImport: (rows: Record<string, unknown>[]) => Promise<CsvImportPreview>;
  commitRegistrationImport: (rows: Record<string, unknown>[]) => Promise<unknown>;
  getRegistrationImportTemplate: () => Promise<{ filename: string; headers: string[] }>;
  getFixtures: (query?: URLSearchParams) => Promise<Paginated<Fixture>>;
  getAdminFixtures: (query?: URLSearchParams) => Promise<Paginated<Fixture>>;
  getResults: (query?: URLSearchParams) => Promise<Paginated<Fixture>>;
  getFixture: (uuid: string) => Promise<Fixture>;
  createFixture: (input: Record<string, unknown>) => Promise<FixtureMutationResult>;
  updateFixture: (uuid: string, input: Record<string, unknown>) => Promise<FixtureMutationResult>;
  updateFixtureStatus: (
    uuid: string,
    input: { status: string; reason?: string },
  ) => Promise<FixtureMutationResult>;
  getLiveMatch: (uuid: string, afterRevision?: number) => Promise<LiveMatchState>;
  getLiveMatchStreamUrl: (uuid: string, afterRevision?: number) => string;
  claimFixture: (uuid: string) => Promise<unknown>;
  releaseFixture: (uuid: string) => Promise<unknown>;
  controlClock: (
    uuid: string,
    action: string,
    input?: Record<string, unknown>,
  ) => Promise<LiveMatchState>;
  appendMatchEvent: (uuid: string, input: Record<string, unknown>) => Promise<LiveMatchState>;
  voidMatchEvent: (uuid: string, eventUuid: string, reason: string) => Promise<LiveMatchState>;
  completeFixture: (uuid: string) => Promise<unknown>;
  confirmResult: (uuid: string) => Promise<unknown>;
  getStandings: (competitionUuid: string, seasonUuid?: string) => Promise<StandingRow[]>;
  getTeamStatistics: (teamUuid: string) => Promise<TeamStatistic[]>;
  getPlayerLeaders: (statKey?: string) => Promise<PlayerLeader[]>;
  createDisciplineRecord: (input: Record<string, unknown>) => Promise<unknown>;
  rebuildStandings: (input: { competitionId: number; seasonId: number }) => Promise<unknown>;
  getNotificationPreferences: () => Promise<NotificationPreferencesResponse>;
  saveNotificationPreferences: (
    preferences: NotificationPreferencesResponse['preferences'],
  ) => Promise<NotificationPreferencesResponse>;
  syncNotificationSubscription: (input: Record<string, unknown>) => Promise<unknown>;
  followNotificationTarget: (input: {
    entityType: 'team' | 'competition';
    entityUuid: string;
    status?: 'active' | 'muted';
  }) => Promise<unknown>;
  adminTestNotification: (input: Record<string, unknown>) => Promise<unknown>;
  getNotificationAdminStatus: () => Promise<NotificationAdminStatus>;
  processNotificationQueue: () => Promise<Record<string, number>>;
  getFootballProviderHealth: () => Promise<ProviderHealth>;
  syncFootballProvider: (input: {
    syncType: 'competitions' | 'teams' | 'fixtures' | 'live' | 'standings';
    dryRun: boolean;
    filters?: Record<string, unknown>;
  }) => Promise<ProviderSyncResult>;
  getProviderHealth: (sport: 'football' | 'basketball') => Promise<ProviderHealth>;
  syncProvider: (
    sport: 'football' | 'basketball',
    input: {
      syncType:
        | 'competitions'
        | 'teams'
        | 'players'
        | 'fixtures'
        | 'upcoming'
        | 'previous'
        | 'live'
        | 'standings'
        | 'statistics';
      dryRun: boolean;
      filters?: Record<string, unknown>;
    },
  ) => Promise<ProviderSyncResult>;
  getBasketballLive: () => Promise<BasketballLiveGame[]>;
  getFootballLive: () => Promise<FootballProviderLiveGame[]>;
  getProviderMatches: (
    sport: 'football' | 'basketball',
    period: 'upcoming' | 'previous',
    date?: string,
  ) => Promise<ProviderUpcomingMatch[]>;
  getFootballMatch: (providerId: string) => Promise<FootballMatchDetails>;
  getNews: (category?: string) => Promise<NewsItem[]>;
  sendContactMessage: (input: {
    name: string;
    email: string;
    subject: string;
    message: string;
    website?: string;
  }) => Promise<{ message: string }>;
  getRssDashboard: () => Promise<RssDashboard>;
  createRssSource: (
    input: Omit<RssSource, 'id' | 'lastRunAt' | 'lastSuccessAt' | 'lastError' | 'importedTotal'>,
  ) => Promise<RssSource>;
  updateRssSource: (id: string, input: Partial<RssSource>) => Promise<RssSource>;
  deleteRssSource: (id: string) => Promise<{ deleted: boolean }>;
  updateRssSettings: (input: RssSettings) => Promise<RssSettings>;
  syncRss: (sourceId?: string) => Promise<RssSyncResult>;
  getFavourites: () => Promise<Favourite[]>;
  followFavourite: (input: {
    entityType: FavouriteEntityType;
    entityUuid: string;
  }) => Promise<Favourite>;
  unfollowFavourite: (entityType: FavouriteEntityType, entityUuid: string) => Promise<unknown>;
  mergeAnonymousFavourites: (favourites: Favourite[]) => Promise<{ favourites: Favourite[] }>;
  getUserPreferences: () => Promise<UserPreferences>;
  saveUserPreferences: (input: UserPreferences) => Promise<UserPreferences>;
  getPersonalFeed: () => Promise<PersonalFeed>;
  search: (query: string) => Promise<SearchResult[]>;
  getAlertHistory: () => Promise<AlertHistoryItem[]>;
  getFantasyGames: () => Promise<FantasyGame[]>;
  getFantasyGame: (uuid: string) => Promise<FantasyGame>;
  getFantasyPlayers: (uuid: string, query?: URLSearchParams) => Promise<FantasyPlayer[]>;
  getFantasySquad: (uuid: string) => Promise<FantasySquadState>;
  saveFantasySquad: (
    uuid: string,
    input: { name: string; baseRevision: number; players: FantasySquadEntry[] },
  ) => Promise<FantasySquadState>;
  submitFantasySquad: (
    uuid: string,
    input: { name: string; baseRevision: number; players: FantasySquadEntry[] },
  ) => Promise<FantasySquadState>;
  createFantasyGame: (input: Record<string, unknown>) => Promise<FantasyGame>;
  getFantasyPoints: (uuid: string) => Promise<FantasyPointBreakdown[]>;
  getFantasyLiveTracker: (uuid: string) => Promise<FantasyLiveRow[]>;
  makeFantasyTransfer: (
    uuid: string,
    input: Record<string, unknown>,
  ) => Promise<FantasyTransferResult>;
  createFantasyLeague: (uuid: string, input: Record<string, unknown>) => Promise<FantasyLeague>;
  getFantasyLeague: (uuid: string) => Promise<FantasyLeague>;
  createFantasyRule: (uuid: string, input: Record<string, unknown>) => Promise<unknown>;
  overrideFantasyPoints: (uuid: string, input: Record<string, unknown>) => Promise<unknown>;
  getOperationsDashboard: () => Promise<OperationsDashboard>;
  updateOperationsSettings: (input: Partial<OperationsSettings>) => Promise<OperationsSettings>;
  runOperationsAction: (
    action:
      | 'retry_failed_jobs'
      | 'standings_rebuild'
      | 'fantasy_recalculation'
      | 'diagnostic_report'
      | 'bootstrap_cffl_lagos'
      | 'football_live_sync'
      | 'basketball_live_sync',
    input?: Record<string, unknown>,
  ) => Promise<OperationsActionResult>;
  exportOperations: (type: string) => Promise<OperationsExport>;
}

export function createApiClient(settings: BootstrapSettings): ApiClient {
  let nonce = settings.nonce;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
    const response = await fetch(`${settings.apiBase.replace(/\/$/, '')}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(nonce ? { 'X-WP-Nonce': nonce } : {}),
        ...init.headers,
      },
    });

    const payload = (await response.json()) as ApiEnvelope<T> & {
      code?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new ApiError(
        payload.message ?? payload.errors?.[0]?.message ?? 'The request could not be completed.',
        response.status,
        payload.code ?? payload.errors?.[0]?.code,
      );
    }

    return payload.data;
  }

  async function envelope<T>(path: string): Promise<ApiEnvelope<T>> {
    const response = await fetch(`${settings.apiBase.replace(/\/$/, '')}${path}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok) {
      throw new ApiError(
        payload.errors?.[0]?.message ?? 'The request could not be completed.',
        response.status,
        payload.errors?.[0]?.code,
      );
    }
    return payload;
  }

  return {
    async getAuthState() {
      const state = await request<AuthState>('/auth/status');
      nonce = state.nonce ?? nonce;
      return state;
    },
    async login(input) {
      const state = await request<AuthState>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      nonce = state.nonce ?? nonce;
      return state;
    },
    async register(input) {
      const state = await request<AuthState>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      nonce = state.nonce ?? nonce;
      return state;
    },
    forgotPassword: (email) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    logout: () => request('/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
    async setTheme(theme) {
      const result = await request<{ theme: ThemePreference }>('/me/theme', {
        method: 'PUT',
        body: JSON.stringify({ theme }),
      });
      return result.theme;
    },
    getSports: () => request<Sport[]>('/sports'),
    getAdminSports: () => request<Sport[]>('/sports?include_archived=1'),
    async getCompetitions(query = new URLSearchParams()) {
      const payload = await envelope<Competition[]>(
        `/competitions${query.size ? `?${query}` : ''}`,
      );
      return {
        items: payload.data,
        page: Number(payload.meta.page ?? 1),
        perPage: Number(payload.meta.perPage ?? 12),
        total: Number(payload.meta.total ?? 0),
        totalPages: Number(payload.meta.totalPages ?? 0),
      };
    },
    getCompetition: (uuid, query) =>
      request<Competition>(`/competitions/${uuid}${query ? `?${query}` : ''}`),
    createSport: (input) =>
      request<Sport>('/admin/sports', { method: 'POST', body: JSON.stringify(input) }),
    createCompetition: (input) =>
      request<Competition>('/admin/competitions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateCompetition: (uuid, input) =>
      request<Competition>(`/admin/competitions/${uuid}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    changeCompetitionStatus: (uuid, action) =>
      request(`/admin/competitions/${uuid}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    createSeason: (competitionUuid, input) =>
      request(`/admin/competitions/${competitionUuid}/seasons`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    setDefaultSeason: (competitionUuid, seasonUuid) =>
      request(`/admin/competitions/${competitionUuid}/default-season`, {
        method: 'POST',
        body: JSON.stringify({ seasonUuid }),
      }),
    updateSeason: (uuid, input) =>
      request(`/admin/seasons/${uuid}`, { method: 'PATCH', body: JSON.stringify(input) }),
    changeSeasonStatus: (uuid, action) =>
      request(`/admin/seasons/${uuid}/${action}`, { method: 'POST' }),
    createCatalogRecord: (entity, input) =>
      request(`/admin/${entity}`, { method: 'POST', body: JSON.stringify(input) }),
    updateCatalogRecord: (entity, uuid, input) =>
      request(`/admin/${entity}/${uuid}`, { method: 'PATCH', body: JSON.stringify(input) }),
    changeCatalogStatus: (entity, uuid, action) =>
      request(`/admin/${entity}/${uuid}/${action}`, { method: 'POST', body: JSON.stringify({}) }),
    async getTeams(query = new URLSearchParams()) {
      const payload = await envelope<Team[]>(`/teams${query.size ? `?${query}` : ''}`);
      return pageFromEnvelope(payload);
    },
    getTeam: (uuid) => request<Team>(`/teams/${uuid}`),
    async getPlayers(query = new URLSearchParams()) {
      const payload = await envelope<Player[]>(`/players${query.size ? `?${query}` : ''}`);
      return pageFromEnvelope(payload);
    },
    getPlayer: (uuid) => request<Player>(`/players/${uuid}`),
    createTeam: (input) =>
      request<Team>('/admin/teams', { method: 'POST', body: JSON.stringify(input) }),
    createPlayer: (input) =>
      request<Player>('/admin/players', { method: 'POST', body: JSON.stringify(input) }),
    createVenue: (input) =>
      request('/admin/venues', { method: 'POST', body: JSON.stringify(input) }),
    createOfficial: (input) =>
      request('/admin/officials', { method: 'POST', body: JSON.stringify(input) }),
    getVenues: () => request<Venue[]>('/admin/venues'),
    getOfficials: () => request<Official[]>('/admin/officials'),
    createRegistration: (input) =>
      request('/admin/registrations', { method: 'POST', body: JSON.stringify(input) }),
    updateRegistration: (uuid, input) =>
      request(`/admin/registrations/${uuid}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    updateAdminEntity: (entity, uuid, input) =>
      request(`/admin/${entity}/${uuid}`, { method: 'PATCH', body: JSON.stringify(input) }),
    changeAdminEntityStatus: (entity, uuid, action) =>
      request(`/admin/${entity}/${uuid}/${action}`, { method: 'POST', body: JSON.stringify({}) }),
    uploadMedia: (file) => {
      const body = new FormData();
      body.append('file', file);
      return request<MediaUpload>('/admin/media', { method: 'POST', body });
    },
    getAccounts: () => request<OperationalAccount[]>('/admin/accounts'),
    createAccount: (input) =>
      request<OperationalAccount>('/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    previewRegistrationImport: (rows) =>
      request<CsvImportPreview>('/admin/registrations/import/preview', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      }),
    commitRegistrationImport: (rows) =>
      request('/admin/registrations/import/commit', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      }),
    getRegistrationImportTemplate: () =>
      request<{ filename: string; headers: string[] }>('/admin/registrations/import/template'),
    async getFixtures(query = new URLSearchParams()) {
      const payload = await envelope<Fixture[]>(`/fixtures${query.size ? `?${query}` : ''}`);
      return pageFromEnvelope(payload);
    },
    async getAdminFixtures(query = new URLSearchParams()) {
      const payload = await envelope<Fixture[]>(`/admin/fixtures${query.size ? `?${query}` : ''}`);
      return pageFromEnvelope(payload);
    },
    async getResults(query = new URLSearchParams()) {
      const payload = await envelope<Fixture[]>(`/results${query.size ? `?${query}` : ''}`);
      return pageFromEnvelope(payload);
    },
    getFixture: (uuid) => request<Fixture>(`/fixtures/${uuid}`),
    createFixture: (input) =>
      request<FixtureMutationResult>('/admin/fixtures', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateFixture: (uuid, input) =>
      request<FixtureMutationResult>(`/admin/fixtures/${uuid}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    updateFixtureStatus: (uuid, input) =>
      request<FixtureMutationResult>(`/admin/fixtures/${uuid}/status`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getLiveMatch: (uuid, afterRevision = 0) =>
      request<LiveMatchState>(
        `/fixtures/${uuid}/live${afterRevision > 0 ? `?after_revision=${afterRevision}` : ''}`,
      ),
    getLiveMatchStreamUrl: (uuid, afterRevision = 0) =>
      `${settings.apiBase.replace(/\/$/, '')}/fixtures/${uuid}/live/stream${
        afterRevision > 0 ? `?after_revision=${afterRevision}` : ''
      }`,
    claimFixture: (uuid) =>
      request(`/operations/fixtures/${uuid}/claim`, { method: 'POST', body: JSON.stringify({}) }),
    releaseFixture: (uuid) =>
      request(`/operations/fixtures/${uuid}/release`, { method: 'POST', body: JSON.stringify({}) }),
    controlClock: (uuid, action, input = {}) =>
      request<LiveMatchState>(`/operations/fixtures/${uuid}/clock/${action}`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    appendMatchEvent: (uuid, input) =>
      request<LiveMatchState>(`/operations/fixtures/${uuid}/events`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    voidMatchEvent: (uuid, eventUuid, reason) =>
      request<LiveMatchState>(`/operations/fixtures/${uuid}/events/${eventUuid}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    completeFixture: (uuid) =>
      request(`/operations/fixtures/${uuid}/complete`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    confirmResult: (uuid) =>
      request(`/admin/fixtures/${uuid}/confirm-result`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    getStandings: (competitionUuid, seasonUuid = '') =>
      request<StandingRow[]>(
        `/competitions/${competitionUuid}/standings${seasonUuid ? `?season=${seasonUuid}` : ''}`,
      ),
    getTeamStatistics: (teamUuid) => request<TeamStatistic[]>(`/teams/${teamUuid}/statistics`),
    getPlayerLeaders: (statKey = 'touchdowns') =>
      request<PlayerLeader[]>(`/players/leaders?stat=${encodeURIComponent(statKey)}`),
    createDisciplineRecord: (input) =>
      request('/admin/discipline', { method: 'POST', body: JSON.stringify(input) }),
    rebuildStandings: (input) =>
      request('/admin/standings/rebuild', { method: 'POST', body: JSON.stringify(input) }),
    getNotificationPreferences: () =>
      request<NotificationPreferencesResponse>('/notifications/preferences'),
    saveNotificationPreferences: (preferences) =>
      request<NotificationPreferencesResponse>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      }),
    syncNotificationSubscription: (input) =>
      request('/notifications/subscriptions/sync', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    followNotificationTarget: (input) =>
      request('/notifications/follows', { method: 'POST', body: JSON.stringify(input) }),
    adminTestNotification: (input) =>
      request('/admin/notifications/test-send', { method: 'POST', body: JSON.stringify(input) }),
    getNotificationAdminStatus: () =>
      request<NotificationAdminStatus>('/admin/notifications/status'),
    processNotificationQueue: () =>
      request<Record<string, number>>('/admin/notifications/process', { method: 'POST' }),
    getFootballProviderHealth: () => request<ProviderHealth>('/admin/providers/football/health'),
    syncFootballProvider: (input) =>
      request<ProviderSyncResult>('/admin/providers/football/sync', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getProviderHealth: (sport) => request<ProviderHealth>(`/admin/providers/${sport}/health`),
    syncProvider: (sport, input) =>
      request<ProviderSyncResult>(`/admin/providers/${sport}/sync`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getBasketballLive: () => request<BasketballLiveGame[]>('/basketball/live'),
    getFootballLive: () => request<FootballProviderLiveGame[]>('/football/live'),
    getProviderMatches: (sport, period, date) =>
      request<ProviderUpcomingMatch[]>(
        `/providers/${sport}/${period}${date ? `?date=${encodeURIComponent(date)}` : ''}`,
      ),
    getFootballMatch: (providerId) =>
      request<FootballMatchDetails>(`/football/matches/${encodeURIComponent(providerId)}`),
    getNews: (category) =>
      request<NewsItem[]>(`/news${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    sendContactMessage: (input) =>
      request<{ message: string }>('/contact', { method: 'POST', body: JSON.stringify(input) }),
    getRssDashboard: () => request<RssDashboard>('/admin/rss'),
    createRssSource: (input) =>
      request<RssSource>('/admin/rss', { method: 'POST', body: JSON.stringify(input) }),
    updateRssSource: (id, input) =>
      request<RssSource>(`/admin/rss/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    deleteRssSource: (id) =>
      request<{ deleted: boolean }>(`/admin/rss/${id}`, { method: 'DELETE' }),
    updateRssSettings: (input) =>
      request<RssSettings>('/admin/rss/settings', { method: 'PUT', body: JSON.stringify(input) }),
    syncRss: (sourceId) =>
      request<RssSyncResult>('/admin/rss/sync', {
        method: 'POST',
        body: JSON.stringify(sourceId ? { sourceId } : {}),
      }),
    getFavourites: () => request<Favourite[]>('/me/favourites'),
    followFavourite: (input) =>
      request<Favourite>('/me/favourites', { method: 'POST', body: JSON.stringify(input) }),
    unfollowFavourite: (entityType, entityUuid) =>
      request(`/me/favourites/${entityType}/${entityUuid}`, { method: 'DELETE' }),
    mergeAnonymousFavourites: (favourites) =>
      request<{ favourites: Favourite[] }>('/me/favourites/merge', {
        method: 'POST',
        body: JSON.stringify({ favourites }),
      }),
    getUserPreferences: () => request<UserPreferences>('/me/preferences'),
    saveUserPreferences: (input) =>
      request<UserPreferences>('/me/preferences', { method: 'PUT', body: JSON.stringify(input) }),
    getPersonalFeed: () => request<PersonalFeed>('/me/feed'),
    search: (query) => request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
    getAlertHistory: () => request<AlertHistoryItem[]>('/me/alerts'),
    getFantasyGames: () => request<FantasyGame[]>('/fantasy/games'),
    getFantasyGame: (uuid) => request<FantasyGame>(`/fantasy/games/${uuid}`),
    getFantasyPlayers: (uuid, query = new URLSearchParams()) =>
      request<FantasyPlayer[]>(`/fantasy/games/${uuid}/players${query.size ? `?${query}` : ''}`),
    getFantasySquad: (uuid) => request<FantasySquadState>(`/fantasy/games/${uuid}/squad`),
    saveFantasySquad: (uuid, input) =>
      request<FantasySquadState>(`/fantasy/games/${uuid}/squad`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    submitFantasySquad: (uuid, input) =>
      request<FantasySquadState>(`/fantasy/games/${uuid}/squad/submit`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    createFantasyGame: (input) =>
      request<FantasyGame>('/admin/fantasy/games', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getFantasyPoints: (uuid) => request<FantasyPointBreakdown[]>(`/fantasy/games/${uuid}/points`),
    getFantasyLiveTracker: (uuid) =>
      request<FantasyLiveRow[]>(`/fantasy/games/${uuid}/live-tracker`),
    makeFantasyTransfer: (uuid, input) =>
      request<FantasyTransferResult>(`/fantasy/games/${uuid}/transfers`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    createFantasyLeague: (uuid, input) =>
      request<FantasyLeague>(`/fantasy/games/${uuid}/leagues`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getFantasyLeague: (uuid) => request<FantasyLeague>(`/fantasy/leagues/${uuid}`),
    createFantasyRule: (uuid, input) =>
      request(`/admin/fantasy/games/${uuid}/rules`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    overrideFantasyPoints: (uuid, input) =>
      request(`/admin/fantasy/games/${uuid}/override`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getOperationsDashboard: () => request<OperationsDashboard>('/operations/dashboard'),
    updateOperationsSettings: (input) =>
      request<OperationsSettings>('/operations/settings', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    runOperationsAction: (action, input = {}) =>
      request<OperationsActionResult>(`/operations/actions/${action}`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    exportOperations: (type) =>
      request<OperationsExport>(`/operations/exports/${type}`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  };
}

function pageFromEnvelope<T>(payload: ApiEnvelope<T[]>): Paginated<T> {
  return {
    items: payload.data,
    page: Number(payload.meta.page ?? 1),
    perPage: Number(payload.meta.perPage ?? 12),
    total: Number(payload.meta.total ?? 0),
    totalPages: Number(payload.meta.totalPages ?? 0),
  };
}
