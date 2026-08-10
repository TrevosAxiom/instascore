export type ThemePreference = 'light' | 'dark' | 'system';

export interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  errors: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface BootstrapSettings {
  apiBase: string;
  appBase: string;
  loginUrl: string;
  nonce: string | null;
  manifestUrl?: string;
  serviceWorkerUrl?: string;
  offlineUrl?: string;
  oneSignal?: OneSignalSettings;
}

export interface OneSignalSettings {
  appId: string;
  enabled: boolean;
  sdkUrl: string;
  serviceWorkerPath: string;
  serviceWorkerUrl: string;
}

export interface NotificationPreference {
  category: string;
  enabled: boolean | number;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
}

export interface NotificationPreferencesResponse {
  categories: string[];
  preferences: NotificationPreference[];
  disabled: boolean;
  workerUrl: string;
}

export interface ProviderHealth {
  provider: string;
  sport: 'football' | 'basketball';
  configured: boolean;
  baseUrl: string;
  secretExposed: boolean;
  schedules: Record<string, string>;
  conflicts: ProviderMapping[];
  recentSyncLogs: ProviderSyncLog[];
}

export interface ProviderMapping {
  uuid: string;
  provider_name: string;
  entity_type: string;
  provider_object_id: string;
  display_name: string | null;
  status: string;
  conflict_reason: string | null;
  last_seen_at: string;
}

export interface ProviderSyncLog {
  uuid: string;
  provider_name: string;
  sync_type: string;
  dry_run: number;
  status: string;
  error_message: string | null;
  last_known_at: string | null;
  created_at: string;
}

export interface ProviderSyncResult {
  status: string;
  dryRun: boolean;
  count: number;
  preview: Record<string, unknown>[];
  error?: string;
}

export interface OperationsDashboard {
  summary: {
    competitions: number;
    activeLiveFixtures: number;
    resultsAwaitingConfirmation: number;
    providerFailures: number;
    notificationFailures: number;
    offlineSyncConflicts: number;
    eventConflicts: number;
    openAlerts: number;
  };
  settings: OperationsSettings;
  logs: Record<string, Record<string, unknown>[]>;
  healthReport: Record<string, unknown>;
}

export interface OperationsSettings {
  maintenanceMode: boolean;
  emergencyNotificationsDisabled: boolean;
  dataRetentionDays: number;
  featureFlags: Record<string, boolean>;
  providerSettings: {
    football: ProviderApiSettings;
    basketball: ProviderApiSettings;
  };
}

export interface ProviderApiSettings {
  providerName: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  pollingEnabled: boolean;
  liveIntervalSeconds: number;
  leagueIds?: string[];
  apiKey?: string;
  clearApiKey?: boolean;
}

export interface OperationsActionResult {
  status: string;
  action?: string;
  message?: string;
  createdAt?: string;
  redacted?: boolean;
  sections?: Record<string, unknown>;
}

export interface OperationsExport {
  filename: string;
  content: string;
  redacted: boolean;
}

export interface BasketballLiveGame {
  providerId: string;
  competitionName?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
  homeScore: number;
  awayScore: number;
  status: string;
  kickoffAt?: string;
  sport: 'basketball';
  sportState: {
    period: number;
    periodLabel: string;
    clock?: string;
    periodScores: { label: string; home: number; away: number }[];
    overtimePeriods: number;
    scoreReconciled: boolean;
  };
}

export interface FootballProviderLiveGame {
  providerId: string;
  competitionProviderId: string;
  competitionName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogoUrl: string;
  awayTeamLogoUrl: string;
  homeScore: number;
  awayScore: number;
  kickoffAt: string;
  status: FixtureStatus;
  statusShort?: string;
  elapsed?: number;
  round?: string;
  venueName?: string;
}

export type ProviderUpcomingMatch = FootballProviderLiveGame | BasketballLiveGame;

export interface FootballMatchDetails {
  match: FootballProviderLiveGame;
  events: Array<{
    elapsed: number;
    extra: number;
    teamId: string;
    teamName: string;
    teamLogoUrl: string;
    playerName: string;
    assistName: string;
    type: string;
    detail: string;
    comments: string;
  }>;
  lineups: Array<{
    teamId: string;
    teamName: string;
    teamLogoUrl: string;
    formation: string;
    coachName: string;
    coachPhotoUrl: string;
    startXI: Array<{ id: string; name: string; number: number; position: string }>;
    substitutes: Array<{ id: string; name: string; number: number; position: string }>;
  }>;
  statistics: Array<{
    teamId: string;
    teamName: string;
    teamLogoUrl: string;
    items: Array<{ label: string; value: string | number | null }>;
  }>;
  standings: Array<{
    teamProviderId: string;
    teamName: string;
    teamLogoUrl: string;
    position: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    pointDifference: number;
  }>;
  updatedAt: string;
}

export interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  categories: { name: string; slug: string }[];
}

export interface RssSource {
  id: string;
  site: string;
  url: string;
  category: string;
  status: 'active' | 'inactive';
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string;
  importedTotal: number;
}

export interface RssSettings {
  interval: 'every_15_minutes' | 'hourly' | 'twicedaily' | 'daily';
  batchSize: number;
  postStatus: 'publish' | 'draft';
}

export interface RssDashboard {
  sources: RssSource[];
  settings: RssSettings;
  lastRun: null | { imported: number; duplicates: number; failed: number; completedAt: string };
  nextRunAt: number | null;
}

export interface RssSyncResult {
  sources: number;
  imported: number;
  duplicates: number;
  failed: number;
}

export interface AuthUser {
  uuid: string;
  displayName: string;
  roles: string[];
  capabilities: {
    accessAdmin: boolean;
    accessOperations: boolean;
    manageLeagues: boolean;
    manageCompetitions: boolean;
    manageTeams: boolean;
    managePlayers: boolean;
    manageVenues: boolean;
    manageOfficials: boolean;
    manageUsers?: boolean;
    manageFixtures: boolean;
    manageScoring: boolean;
    confirmResults: boolean;
  };
}

export type CompetitionType = 'league' | 'cup' | 'tournament' | 'friendly' | 'group';

export interface Sport {
  uuid: string;
  name: string;
  slug: string;
  status?: string;
}

export interface Season {
  uuid: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface Competition {
  uuid: string;
  name: string;
  slug: string;
  type: CompetitionType;
  description: string;
  countryCode: string | null;
  logoUrl?: string | null;
  sport: Sport;
  rules: Record<string, string | number | boolean>;
  status: string;
  updatedAt: string;
  seasons?: Season[];
}

export interface MediaUpload {
  attachmentId: number;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface OperationalAccount {
  uuid: string;
  displayName: string;
  email: string;
  role: string;
  officialType: string;
  invitationSent?: boolean;
}

export interface Venue {
  uuid: string;
  name: string;
  city: string;
  countryCode: string;
  status: string;
}
export interface Official {
  uuid: string;
  name: string;
  email: string;
  officialType: string;
  countryCode: string;
  status: string;
}

export interface CompetitionPage {
  items: Competition[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface Team {
  uuid: string;
  name: string;
  slug: string;
  shortName: string;
  logoUrl: string | null;
  sport: Sport;
  status: string;
}

export interface PlayerRegistration {
  uuid: string;
  team: { uuid: string; name: string };
  season: { uuid: string; name: string };
  jerseyNumber: number | null;
  positionCode: string;
  eligibilityStatus: string;
  registeredAt: string;
  unregisteredAt: string | null;
  status: string;
}

export interface CurrentPlayerRegistration {
  uuid: string;
  team: { uuid: string; name: string; logoUrl: string | null };
  season: { uuid: string; name: string };
  jerseyNumber: number | null;
  positionCode: string;
}

export interface Player {
  uuid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  slug: string;
  photoUrl: string | null;
  dateOfBirth?: string | null;
  nationality?: string;
  primaryPosition: string;
  eligibilityStatus: string;
  sport: Sport;
  status: string;
  registrations?: PlayerRegistration[];
  currentRegistration?: CurrentPlayerRegistration;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export type FixtureStatus =
  | 'draft'
  | 'scheduled'
  | 'warmup'
  | 'live'
  | 'halftime'
  | 'interval'
  | 'suspended'
  | 'postponed'
  | 'cancelled'
  | 'abandoned'
  | 'completed'
  | 'confirmed';

export interface Fixture {
  uuid: string;
  status: FixtureStatus;
  kickoffAt: string;
  timezone: string;
  roundName: string;
  matchDay: number | null;
  legNumber: number | null;
  bracketSlot: string;
  competition: { uuid: string; name: string };
  season: { uuid: string; name: string };
  sport: Sport;
  homeTeam: { uuid: string; name: string };
  awayTeam: { uuid: string; name: string };
  venue: { uuid: string; name: string } | null;
  updatedAt: string;
}

export interface FixtureMutationResult {
  fixture: Record<string, unknown>;
  warnings: { type: string; fixture: string; kickoffAt: string; message: string }[];
}

export type ScoreEventType =
  | 'touchdown'
  | 'one_point_conversion'
  | 'two_point_conversion'
  | 'safety'
  | 'interception'
  | 'penalty'
  | 'timeout'
  | 'possession_change'
  | 'period_start'
  | 'period_end';

export interface MatchEvent {
  uuid: string;
  clientEventId: string;
  sequenceNumber: number;
  revision: number;
  eventType: ScoreEventType;
  teamSide: 'home' | 'away' | null;
  period: number;
  clockSeconds: number;
  points: number;
  description: string;
  voided: boolean;
  createdAt: string;
}

export interface MatchClock {
  status: string;
  period: number;
  periodLabel: string;
  clockSeconds: number;
  running: boolean;
  revision: number;
}

export interface LiveMatchState {
  fixture: {
    uuid: string;
    status: string;
    homeTeam: { uuid: string; name: string };
    awayTeam: { uuid: string; name: string };
  };
  score: { home: number; away: number };
  clock: MatchClock;
  events: MatchEvent[];
  revision: number;
  idempotent: boolean;
  event: MatchEvent | null;
  provisional: boolean;
}

export interface StandingRow {
  uuid: string;
  position: number;
  team: { uuid: string; name: string };
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  form: string;
  rebuildHash: string;
  tiebreakerOrder: string[];
}

export interface TeamStatistic {
  team: { uuid: string; name: string };
  statKey: string;
  statValue: number;
  updatedAt: string;
}

export interface PlayerLeader {
  player: { uuid: string; name: string };
  team: { uuid: string; name: string } | null;
  statKey: string;
  statValue: number;
}

export interface CsvImportPreview {
  valid: number;
  errors: { row: number; fields: Record<string, string> }[];
  preview: Record<string, unknown>[];
}

export interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
  nonce: string | null;
  theme: ThemePreference | null;
}

export type FavouriteEntityType = 'team' | 'competition' | 'player';

export interface Favourite {
  uuid?: string;
  entity_type?: FavouriteEntityType;
  entity_uuid?: string;
  entityType?: FavouriteEntityType;
  entityUuid?: string;
  status?: string;
  source?: string;
}

export interface UserPreferences {
  timezone: string;
  language: string;
  preferredSports: string[];
}

export interface PersonalFeed {
  favourites: Favourite[];
  items: Record<string, unknown>[];
  suggestions: { type: string; label: string }[];
}

export interface SearchResult {
  type: FavouriteEntityType | 'fixture';
  uuid: string;
  label: string;
  url: string;
}

export interface AlertHistoryItem {
  uuid: string;
  category: string;
  entity_type: string | null;
  entity_uuid: string | null;
  title: string;
  body: string | null;
  launch_url: string | null;
  delivery_status: string;
  suppressed: number;
  created_at: string;
}

export interface FantasyPosition {
  uuid: string;
  code: string;
  name: string;
  minSquad: number;
  maxSquad: number;
  minStarting: number;
  maxStarting: number;
}

export interface FantasyGame {
  uuid: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  budgetCents: number;
  squadSize: number;
  startingSize: number;
  benchSize: number;
  maxPlayersPerTeam: number;
  sport: Sport;
  positions?: FantasyPosition[];
  formationRules?: Record<string, unknown>;
}

export interface FantasyPlayer {
  uuid: string;
  priceCents: number;
  status: string;
  position: { code: string; name: string };
  player: { uuid: string; name: string; photoUrl?: string | null };
  team: { uuid: string; name: string };
}

export interface FantasySquadEntry {
  fantasyPlayerUuid: string;
  slotType: 'starting' | 'bench';
  slotNumber: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  priceCents?: number;
  position?: { code: string; name: string };
  player?: { uuid: string; name: string };
  team?: { uuid: string; name: string };
}

export interface FantasySquadState {
  game: FantasyGame;
  gameweek: {
    uuid: string;
    name: string;
    sequenceNumber: number;
    deadlineAt: string;
    locked: boolean;
  };
  squad: null | {
    uuid: string;
    name: string;
    status: 'draft' | 'submitted';
    revision: number;
    totalCostCents: number;
    remainingBudget: number;
    players: FantasySquadEntry[];
  };
}

export interface FantasyPointBreakdown {
  uuid: string;
  playerName: string;
  points: number;
  status: 'provisional' | 'confirmed';
  revision: number;
  breakdown: Record<string, unknown>;
  updatedAt: string;
}

export interface FantasyLiveRow {
  playerName: string;
  points: number;
  status: string;
}

export interface FantasyTransferResult {
  uuid: string;
  costPoints: number;
  freeTransferUsed: boolean;
  status: string;
}

export interface FantasyLeague {
  uuid: string;
  name: string;
  visibility: 'public' | 'private';
  inviteCode: string | null;
  isMember: boolean;
  status: string;
  table?: {
    rank: number;
    previousRank: number;
    movement: number;
    userName: string;
    points: number;
  }[];
}
