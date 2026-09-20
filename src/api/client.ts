import type {
  ApiEnvelope,
  AlertHistoryItem,
  AuthState,
  BasketballLiveGame,
  FootballProviderLiveGame,
  FootballMatchDetails,
  BootstrapSettings,
  Competition,
  CompetitionStructure,
  CompetitionGenerationResult,
  CompetitionPage,
  CsvImportPreview,
  Fixture,
  FixtureCsvImportResult,
  FixtureMutationResult,
  FixtureStream,
  FixtureStreamInput,
  YouTubeBroadcast,
  YouTubeStreamingSettings,
  YouTubeStreamHealth,
  YouTubeControlRoom,
  StreamAnalyticsReport,
  StreamSponsor,
  MatchChatRoom,
  ChatMessage,
  Favourite,
  FavouriteEntityType,
  FantasyGame,
  CreateFantasyGameInput,
  FantasyLeague,
  FantasyLiveRow,
  FantasyPlayer,
  FantasyPointBreakdown,
  FantasySquadEntry,
  FantasySquadState,
  FantasyScoringRule,
  FantasyRecalculationResult,
  FantasyTransferResult,
  LiveMatchState,
  MediaUpload,
  NotificationPreferencesResponse,
  NotificationAdminStatus,
  NewsItem,
  NewsPage,
  RssDashboard,
  RssSettings,
  RssSource,
  RssSyncResult,
  RssCsvImportResult,
  RosterWorkspace,
  OperationsActionResult,
  OperationsDashboard,
  OperationsExport,
  OperationsSettings,
  OperationalAccount,
  ProviderHealth,
  ProviderCompetition,
  ProviderStandingRow,
  ProviderUpcomingMatch,
  ProviderMatchDetails,
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
  getProviderCompetitions: (
    sport: 'football' | 'basketball' | 'nfl',
  ) => Promise<ProviderCompetition[]>;
  getProviderStandings: (
    sport: 'football' | 'basketball' | 'nfl',
    competitionId: string,
    season?: string,
  ) => Promise<ProviderStandingRow[]>;
  getCompetition: (uuid: string, query?: URLSearchParams) => Promise<Competition>;
  createSport: (input: { name: string }) => Promise<Sport>;
  createCompetition: (input: Record<string, unknown>) => Promise<Competition>;
  updateCompetition: (uuid: string, input: Record<string, unknown>) => Promise<Competition>;
  changeCompetitionStatus: (uuid: string, action: 'archive' | 'restore') => Promise<unknown>;
  createSeason: (competitionUuid: string, input: Record<string, unknown>) => Promise<unknown>;
  setDefaultSeason: (competitionUuid: string, seasonUuid: string) => Promise<unknown>;
  updateSeason: (uuid: string, input: Record<string, unknown>) => Promise<unknown>;
  changeSeasonStatus: (
    uuid: string,
    action: 'archive' | 'restore' | 'complete',
  ) => Promise<unknown>;
  getCompetitionStructure: (uuid: string, seasonUuid: string) => Promise<CompetitionStructure>;
  generateCompetitionFixtures: (
    uuid: string,
    input: Record<string, unknown>,
  ) => Promise<CompetitionGenerationResult>;
  generateCompetitionPlayoffs: (
    uuid: string,
    input: Record<string, unknown>,
  ) => Promise<CompetitionGenerationResult>;
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
  getRosterWorkspace: () => Promise<RosterWorkspace>;
  submitRosterRequest: (input: Record<string, unknown>) => Promise<unknown>;
  reviewRosterRequest: (
    uuid: string,
    decision: 'approve' | 'reject',
    notes?: string,
  ) => Promise<unknown>;
  getFixtures: (query?: URLSearchParams) => Promise<Paginated<Fixture>>;
  getAdminFixtures: (query?: URLSearchParams) => Promise<Paginated<Fixture>>;
  getResults: (query?: URLSearchParams) => Promise<Paginated<Fixture>>;
  getFixture: (uuid: string) => Promise<Fixture>;
  createFixture: (input: Record<string, unknown>) => Promise<FixtureMutationResult>;
  importFixturesCsv: (file: File) => Promise<FixtureCsvImportResult>;
  updateFixture: (uuid: string, input: Record<string, unknown>) => Promise<FixtureMutationResult>;
  updateFixtureStatus: (
    uuid: string,
    input: { status: string; reason?: string },
  ) => Promise<FixtureMutationResult>;
  getFixtureStream: (uuid: string) => Promise<FixtureStream>;
  getAdminFixtureStream: (uuid: string) => Promise<FixtureStream | null>;
  saveFixtureStream: (uuid: string, input: FixtureStreamInput) => Promise<FixtureStream>;
  disableFixtureStream: (uuid: string) => Promise<FixtureStream | null>;
  getYouTubeStreamingSettings: () => Promise<YouTubeStreamingSettings>;
  saveYouTubeStreamingSettings: (
    input: Record<string, unknown>,
  ) => Promise<YouTubeStreamingSettings>;
  connectYouTube: () => Promise<{ authorizationUrl: string }>;
  disconnectYouTube: () => Promise<YouTubeStreamingSettings>;
  getYouTubeBroadcasts: () => Promise<YouTubeBroadcast[]>;
  syncYouTubeBroadcasts: () => Promise<{
    broadcastsFound: number;
    streamsUpdated: number;
    syncedAt: string;
  }>;
  getYouTubeStreamHealth: () => Promise<YouTubeStreamHealth>;
  getYouTubeControlRoom: () => Promise<YouTubeControlRoom>;
  attachYouTubeBroadcast: (input: {
    fixtureUuid: string;
    videoId: string;
  }) => Promise<FixtureStream>;
  autoMatchYouTubeBroadcasts: () => Promise<
    Array<{ videoId: string; fixtureUuid: string; score: number }>
  >;
  getStreamSponsors: (fixtureUuid: string) => Promise<StreamSponsor[]>;
  recordStreamEngagement: (
    fixtureUuid: string,
    input: Record<string, unknown>,
  ) => Promise<{ recorded: boolean }>;
  recordSponsorEvent: (
    sponsorUuid: string,
    metric: 'impression' | 'click',
    sessionId: string,
  ) => Promise<{ recorded: boolean }>;
  getStreamAnalytics: () => Promise<StreamAnalyticsReport>;
  createStreamSponsor: (input: Record<string, unknown>) => Promise<StreamSponsor>;
  getMatchChat: (fixtureUuid: string) => Promise<MatchChatRoom>;
  postMatchChat: (
    fixtureUuid: string,
    input: { body: string; parentUuid?: string },
  ) => Promise<ChatMessage>;
  reactToChatMessage: (messageUuid: string, reaction: string) => Promise<{ updated: boolean }>;
  reportChatMessage: (messageUuid: string, reason: string) => Promise<{ reported: boolean }>;
  moderateChatMessage: (messageUuid: string) => Promise<{ moderated: boolean }>;
  banChatAuthor: (
    fixtureUuid: string,
    messageUuid: string,
    input: { hours: number; reason: string },
  ) => Promise<{ banned: boolean; hours: number }>;
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
  getProviderHealth: (sport: 'football' | 'basketball' | 'nfl') => Promise<ProviderHealth>;
  syncProvider: (
    sport: 'football' | 'basketball' | 'nfl',
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
  getProviderLive: (sport: 'football' | 'basketball' | 'nfl') => Promise<ProviderUpcomingMatch[]>;
  getProviderMatches: (
    sport: 'football' | 'basketball' | 'nfl',
    period: 'upcoming' | 'previous',
    date?: string,
  ) => Promise<ProviderUpcomingMatch[]>;
  getFootballMatch: (providerId: string) => Promise<FootballMatchDetails>;
  getProviderMatch: (
    sport: 'basketball' | 'nfl',
    providerId: string,
  ) => Promise<ProviderMatchDetails>;
  getNews: (category?: string) => Promise<NewsItem[]>;
  getNewsArchive: (category?: string, page?: number) => Promise<NewsPage>;
  getNewsItem: (postId: string) => Promise<NewsItem>;
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
  importRssCsv: (file: File) => Promise<RssCsvImportResult>;
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
  getAdminFantasyGames: () => Promise<FantasyGame[]>;
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
  createFantasyGame: (input: CreateFantasyGameInput) => Promise<FantasyGame>;
  getFantasyPoints: (uuid: string) => Promise<FantasyPointBreakdown[]>;
  getFantasyLiveTracker: (uuid: string) => Promise<FantasyLiveRow[]>;
  makeFantasyTransfer: (
    uuid: string,
    input: Record<string, unknown>,
  ) => Promise<FantasyTransferResult>;
  createFantasyLeague: (uuid: string, input: Record<string, unknown>) => Promise<FantasyLeague>;
  getFantasyLeague: (uuid: string) => Promise<FantasyLeague>;
  createFantasyRule: (uuid: string, input: Record<string, unknown>) => Promise<unknown>;
  getFantasyRules: (uuid: string) => Promise<FantasyScoringRule[]>;
  seedFantasyRules: (uuid: string) => Promise<FantasyScoringRule[]>;
  recalculateFantasy: (uuid: string, reason: string) => Promise<FantasyRecalculationResult>;
  finalizeFantasyGameweek: (uuid: string, reason: string) => Promise<{ status: string }>;
  overrideFantasyPoints: (uuid: string, input: Record<string, unknown>) => Promise<unknown>;
  getOperationsDashboard: () => Promise<OperationsDashboard>;
  updateOperationsSettings: (input: Partial<OperationsSettings>) => Promise<OperationsSettings>;
  runOperationsAction: (
    action:
      | 'retry_failed_jobs'
      | 'database_integrity_scan'
      | 'database_retention_cleanup'
      | 'database_safe_repair'
      | 'security_audit'
      | 'security_capability_repair'
      | 'standings_rebuild'
      | 'fantasy_recalculation'
      | 'diagnostic_report'
      | 'bootstrap_cffl_lagos'
      | 'football_live_sync'
      | 'basketball_live_sync'
      | 'nfl_live_sync',
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
      cache: init.cache ?? 'no-store',
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
    getProviderCompetitions: (sport) =>
      request<ProviderCompetition[]>(`/providers/${sport}/competitions`),
    getProviderStandings: (sport, competitionId, season = '') =>
      request<ProviderStandingRow[]>(
        `/providers/${sport}/competitions/${encodeURIComponent(competitionId)}/standings${season ? `?season=${encodeURIComponent(season)}` : ''}`,
      ),
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
    getCompetitionStructure: (uuid, seasonUuid) =>
      request<CompetitionStructure>(
        `/admin/competitions/${uuid}/structure?seasonUuid=${encodeURIComponent(seasonUuid)}`,
      ),
    generateCompetitionFixtures: (uuid, input) =>
      request<CompetitionGenerationResult>(`/admin/competitions/${uuid}/generate-fixtures`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    generateCompetitionPlayoffs: (uuid, input) =>
      request<CompetitionGenerationResult>(`/admin/competitions/${uuid}/generate-playoffs`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
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
    getRosterWorkspace: () => request<RosterWorkspace>('/admin/roster-workspace'),
    submitRosterRequest: (input) =>
      request('/admin/roster-workspace', { method: 'POST', body: JSON.stringify(input) }),
    reviewRosterRequest: (uuid, decision, notes = '') =>
      request(`/admin/roster-requests/${uuid}/${decision}`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
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
    importFixturesCsv: (file) => {
      const body = new FormData();
      body.append('file', file);
      return request<FixtureCsvImportResult>('/admin/fixtures/import', { method: 'POST', body });
    },
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
    getFixtureStream: (uuid) => request<FixtureStream>(`/fixtures/${uuid}/broadcast`),
    getAdminFixtureStream: (uuid) =>
      request<FixtureStream | null>(`/admin/fixtures/${uuid}/broadcast`),
    saveFixtureStream: (uuid, input) =>
      request<FixtureStream>(`/admin/fixtures/${uuid}/broadcast`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    disableFixtureStream: (uuid) =>
      request<FixtureStream | null>(`/admin/fixtures/${uuid}/broadcast`, { method: 'DELETE' }),
    getYouTubeStreamingSettings: () =>
      request<YouTubeStreamingSettings>('/admin/streaming/youtube'),
    saveYouTubeStreamingSettings: (input) =>
      request<YouTubeStreamingSettings>('/admin/streaming/youtube', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    connectYouTube: () =>
      request<{ authorizationUrl: string }>('/admin/streaming/youtube/connect', { method: 'POST' }),
    disconnectYouTube: () =>
      request<YouTubeStreamingSettings>('/admin/streaming/youtube/disconnect', { method: 'POST' }),
    getYouTubeBroadcasts: () => request<YouTubeBroadcast[]>('/admin/streaming/youtube/broadcasts'),
    syncYouTubeBroadcasts: () =>
      request<{ broadcastsFound: number; streamsUpdated: number; syncedAt: string }>(
        '/admin/streaming/youtube/sync',
        { method: 'POST' },
      ),
    getYouTubeStreamHealth: () => request<YouTubeStreamHealth>('/admin/streaming/youtube/health'),
    getYouTubeControlRoom: () =>
      request<YouTubeControlRoom>('/admin/streaming/youtube/control-room'),
    attachYouTubeBroadcast: (input) =>
      request<FixtureStream>('/admin/streaming/youtube/matches', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    autoMatchYouTubeBroadcasts: () =>
      request<Array<{ videoId: string; fixtureUuid: string; score: number }>>(
        '/admin/streaming/youtube/matches',
        { method: 'PUT' },
      ),
    getStreamSponsors: (fixtureUuid) =>
      request<StreamSponsor[]>(`/fixtures/${fixtureUuid}/broadcast/sponsors`),
    recordStreamEngagement: (fixtureUuid, input) =>
      request<{ recorded: boolean }>(`/fixtures/${fixtureUuid}/broadcast/engagement`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    recordSponsorEvent: (sponsorUuid, metric, sessionId) =>
      request<{ recorded: boolean }>(`/streaming/sponsors/${sponsorUuid}/${metric}`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
    getStreamAnalytics: () => request<StreamAnalyticsReport>('/admin/streaming/analytics'),
    createStreamSponsor: (input) =>
      request<StreamSponsor>('/admin/streaming/analytics', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getMatchChat: (fixtureUuid) => request<MatchChatRoom>(`/fixtures/${fixtureUuid}/chat`),
    postMatchChat: (fixtureUuid, input) =>
      request<ChatMessage>(`/fixtures/${fixtureUuid}/chat`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    reactToChatMessage: (messageUuid, reaction) =>
      request<{ updated: boolean }>(`/chat/messages/${messageUuid}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reaction }),
      }),
    reportChatMessage: (messageUuid, reason) =>
      request<{ reported: boolean }>(`/chat/messages/${messageUuid}/reports`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    moderateChatMessage: (messageUuid) =>
      request<{ moderated: boolean }>(`/admin/chat/messages/${messageUuid}`, {
        method: 'DELETE',
      }),
    banChatAuthor: (fixtureUuid, messageUuid, input) =>
      request<{ banned: boolean; hours: number }>(
        `/admin/fixtures/${fixtureUuid}/chat/messages/${messageUuid}/ban`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
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
    getBasketballLive: () => request<BasketballLiveGame[]>(`/basketball/live?_poll=${Date.now()}`),
    getFootballLive: () =>
      request<FootballProviderLiveGame[]>(`/football/live?_poll=${Date.now()}`),
    getProviderLive: (sport) =>
      request<ProviderUpcomingMatch[]>(`/providers/${sport}/live?_poll=${Date.now()}`),
    getProviderMatches: (sport, period, date) =>
      request<ProviderUpcomingMatch[]>(
        `/providers/${sport}/${period}?${new URLSearchParams({
          ...(date ? { date } : {}),
          _poll: String(Date.now()),
        }).toString()}`,
      ),
    getFootballMatch: (providerId) =>
      request<FootballMatchDetails>(`/football/matches/${encodeURIComponent(providerId)}`),
    getProviderMatch: (sport, providerId) =>
      request<ProviderMatchDetails>(
        `/providers/${sport}/matches/${encodeURIComponent(providerId)}`,
      ),
    getNews: (category) =>
      request<NewsItem[]>(`/news${category ? `?category=${encodeURIComponent(category)}` : ''}`),
    getNewsItem: (postId) => request<NewsItem>(`/news/${encodeURIComponent(postId)}`),
    getNewsArchive: async (category, page = 1) => {
      const params = new URLSearchParams({ page: String(page), per_page: '12' });
      if (category) params.set('category', category);
      const response = await envelope<NewsItem[]>(`/news/archive?${params.toString()}`);
      return {
        items: response.data,
        page: Number(response.meta.page ?? page),
        perPage: Number(response.meta.perPage ?? 12),
        total: Number(response.meta.total ?? response.data.length),
        totalPages: Number(response.meta.totalPages ?? 1),
      };
    },
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
    importRssCsv: (file) => {
      const body = new FormData();
      body.append('file', file);
      return request<RssCsvImportResult>('/admin/rss/import', { method: 'POST', body });
    },
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
    getAdminFantasyGames: () => request<FantasyGame[]>('/admin/fantasy/games'),
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
    getFantasyRules: (uuid) => request<FantasyScoringRule[]>(`/admin/fantasy/games/${uuid}/rules`),
    seedFantasyRules: (uuid) =>
      request<FantasyScoringRule[]>(`/admin/fantasy/games/${uuid}/rules/defaults`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    recalculateFantasy: (uuid, reason) =>
      request<FantasyRecalculationResult>(`/admin/fantasy/games/${uuid}/recalculate`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    finalizeFantasyGameweek: (uuid, reason) =>
      request<{ status: string }>(`/admin/fantasy/games/${uuid}/finalize`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
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
