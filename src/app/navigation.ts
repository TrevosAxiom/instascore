export type PublicNavigationGroup = 'Follow' | 'Discover' | 'My InstaScore' | 'Help';

export interface PublicNavigationItem {
  label: string;
  path: string;
  description: string;
  group: PublicNavigationGroup;
  requiresAuth?: boolean;
}

/** Single source of truth for every supporter-facing destination. */
export const publicNavigation: PublicNavigationItem[] = [
  {
    label: 'Scores',
    path: '/scores',
    description: 'Live, previous and upcoming scores',
    group: 'Follow',
  },
  {
    label: 'Fixtures',
    path: '/fixtures',
    description: 'The complete match schedule',
    group: 'Follow',
  },
  { label: 'Results', path: '/results', description: 'Completed matches by date', group: 'Follow' },
  {
    label: 'Tables',
    path: '/standings',
    description: 'Competition standings and form',
    group: 'Follow',
  },
  {
    label: 'Competitions',
    path: '/competitions',
    description: 'Leagues, cups and tournaments',
    group: 'Discover',
  },
  {
    label: 'Teams',
    path: '/teams',
    description: 'Clubs, squads and team profiles',
    group: 'Discover',
  },
  {
    label: 'Players',
    path: '/players',
    description: 'Players, profiles and leaders',
    group: 'Discover',
  },
  { label: 'News', path: '/news', description: 'Stories across every sport', group: 'Discover' },
  {
    label: 'Replays',
    path: '/replays',
    description: 'Completed match broadcasts',
    group: 'Discover',
  },
  {
    label: 'Search',
    path: '/search',
    description: 'Find anything on InstaScore',
    group: 'Discover',
  },
  {
    label: 'Fantasy',
    path: '/fantasy',
    description: 'Build your squad and compete overall',
    group: 'My InstaScore',
  },
  {
    label: 'Store',
    path: '/store',
    description: 'Tickets, memberships and merchandise',
    group: 'My InstaScore',
  },
  {
    label: 'My dashboard',
    path: '/dashboard',
    description: 'Your personalised match-day home',
    group: 'My InstaScore',
    requiresAuth: true,
  },
  {
    label: 'Favourites',
    path: '/favourites',
    description: 'Teams and competitions you follow',
    group: 'My InstaScore',
  },
  {
    label: 'Notifications',
    path: '/notifications',
    description: 'Alerts and quiet hours',
    group: 'My InstaScore',
  },
  {
    label: 'Install app',
    path: '/install',
    description: 'Add InstaScore to this device',
    group: 'Help',
  },
  {
    label: 'Contact',
    path: '/contact',
    description: 'Get support or send feedback',
    group: 'Help',
  },
];

export const publicNavigationGroups: PublicNavigationGroup[] = [
  'Follow',
  'Discover',
  'My InstaScore',
  'Help',
];
