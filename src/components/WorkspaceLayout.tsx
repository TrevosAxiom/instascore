import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router';

import { useAuth } from '../app/auth-context';
import logo from '../assets/instascore-logo-brand.png';
import { usePwa } from '../pwa/PwaProvider';
import type { AuthUser } from '../types/api';
import { ThemeToggle } from './ThemeToggle';

const drawerWidth = 264;

type Capability = keyof AuthUser['capabilities'];
type WorkspaceIconName =
  | 'dashboard'
  | 'competition'
  | 'team'
  | 'people'
  | 'fixture'
  | 'live'
  | 'fantasy'
  | 'discipline'
  | 'notification'
  | 'provider'
  | 'news'
  | 'settings'
  | 'site';

interface WorkspaceItem {
  label: string;
  path: string;
  icon: WorkspaceIconName;
  capability?: Capability;
  role?: string;
  group: 'Workspace' | 'Manage' | 'System';
}

const navigation: WorkspaceItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', group: 'Workspace' },
  {
    label: 'Match-day board',
    path: '/match-day',
    icon: 'live',
    capability: 'accessOperations',
    group: 'Workspace',
  },
  {
    label: 'Today’s fixtures',
    path: '/match-day',
    icon: 'fixture',
    role: 'instascore_match_official',
    group: 'Workspace',
  },
  {
    label: 'Admin overview',
    path: '/admin',
    icon: 'dashboard',
    capability: 'accessAdmin',
    group: 'Manage',
  },
  {
    label: 'System operations',
    path: '/operations',
    icon: 'settings',
    capability: 'accessAdmin',
    group: 'System',
  },
  {
    label: 'Competitions',
    path: '/admin/competitions',
    icon: 'competition',
    capability: 'manageCompetitions',
    group: 'Manage',
  },
  {
    label: 'Teams & players',
    path: '/admin/teams',
    icon: 'team',
    capability: 'manageTeams',
    group: 'Manage',
  },
  {
    label: 'People & access',
    path: '/admin/accounts',
    icon: 'people',
    capability: 'manageUsers',
    group: 'Manage',
  },
  {
    label: 'Fixtures',
    path: '/admin/fixtures',
    icon: 'fixture',
    capability: 'manageFixtures',
    group: 'Manage',
  },
  {
    label: 'Streaming',
    path: '/admin/streaming',
    icon: 'live',
    capability: 'manageFixtures',
    group: 'Manage',
  },
  {
    label: 'Fantasy',
    path: '/admin/fantasy',
    icon: 'fantasy',
    capability: 'manageLeagues',
    group: 'Manage',
  },
  {
    label: 'Discipline',
    path: '/admin/discipline',
    icon: 'discipline',
    capability: 'manageFixtures',
    group: 'Manage',
  },
  {
    label: 'Notifications',
    path: '/admin/notifications',
    icon: 'notification',
    capability: 'accessAdmin',
    group: 'System',
  },
  {
    label: 'Data providers',
    path: '/admin/providers',
    icon: 'provider',
    capability: 'manageLeagues',
    group: 'System',
  },
  {
    label: 'RSS news',
    path: '/admin/rss',
    icon: 'news',
    capability: 'manageLeagues',
    group: 'System',
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: 'settings',
    capability: 'manageLeagues',
    group: 'System',
  },
];

function workspaceLabel(user: AuthUser): string {
  const capabilities = user.capabilities;
  if (capabilities.manageLeagues || capabilities.manageUsers) return 'Administrator';
  if (capabilities.manageCompetitions || capabilities.manageFixtures) return 'Competition manager';
  if (capabilities.manageTeams || capabilities.managePlayers) return 'Team manager';
  if (capabilities.manageScoring || user.roles.includes('instascore_scorekeeper')) {
    return 'Match-day operator';
  }
  if (user.roles.includes('instascore_match_official')) return 'Umpire / official';
  return 'Workspace member';
}

function visibleNavigation(user: AuthUser): WorkspaceItem[] {
  return navigation.filter((item) => {
    if (item.capability && !user.capabilities[item.capability]) return false;
    if (item.role && !user.roles.includes(item.role)) return false;
    return true;
  });
}

function itemIsActive(pathname: string, path: string): boolean {
  if (path === '/admin' || path === '/dashboard' || path === '/operations') {
    return pathname === path;
  }
  return pathname.startsWith(path);
}

function currentPageLabel(pathname: string, items: WorkspaceItem[]): string {
  return (
    [...items]
      .sort((left, right) => right.path.length - left.path.length)
      .find((item) => itemIsActive(pathname, item.path))?.label ?? 'Workspace'
  );
}

export function WorkspaceLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const auth = useAuth();
  const pwa = usePwa();
  const user = auth.state?.user;

  if (!user) return <Outlet />;

  const items = visibleNavigation(user);
  const pageLabel = currentPageLabel(location.pathname, items);
  const roleLabel = workspaceLabel(user);
  const drawer = (
    <Stack sx={{ height: '100%', bgcolor: '#07192d', color: '#fff5d6' }}>
      <Box sx={{ px: 2.25, py: 2 }}>
        <Box component={RouterLink} to="/dashboard" sx={{ display: 'block' }}>
          <Box
            component="img"
            src={logo}
            alt="InstaScore"
            sx={{ width: 190, height: 44, objectFit: 'contain', objectPosition: 'left center' }}
          />
        </Box>
        <Typography sx={{ mt: 1, color: 'rgba(255,245,214,.62)', fontSize: 12, fontWeight: 850 }}>
          OPERATIONS WORKSPACE
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.1)' }} />
      <Box sx={{ px: 1.25, py: 1.5, flex: 1, overflowY: 'auto' }}>
        {(['Workspace', 'Manage', 'System'] as const).map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          return (
            <Box key={group} sx={{ mb: 1.5 }}>
              <Typography
                variant="overline"
                sx={{ display: 'block', px: 1.5, mb: 0.5, color: 'rgba(255,245,214,.48)' }}
              >
                {group}
              </Typography>
              <List disablePadding>
                {groupItems.map((item) => {
                  const active = itemIsActive(location.pathname, item.path);
                  return (
                    <ListItemButton
                      key={item.path}
                      component={RouterLink}
                      to={item.path}
                      selected={active}
                      onClick={() => setMobileOpen(false)}
                      sx={{
                        mb: 0.25,
                        minHeight: 43,
                        borderRadius: 1,
                        color: active ? '#07192d' : '#fff5d6',
                        bgcolor: active ? '#f3c643' : 'transparent',
                        '&.Mui-selected, &.Mui-selected:hover': { bgcolor: '#f3c643' },
                        '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                        <WorkspaceIcon name={item.icon} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 950 : 750 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.1)' }} />
      <Box sx={{ p: 1.25 }}>
        <ListItemButton
          component={RouterLink}
          to="/"
          onClick={() => setMobileOpen(false)}
          sx={{ borderRadius: 1, color: '#fff5d6' }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <WorkspaceIcon name="site" />
          </ListItemIcon>
          <ListItemText primary="View public site" primaryTypographyProps={{ fontWeight: 850 }} />
        </ListItemButton>
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 60, md: 68 }, gap: 1.5 }}>
          <IconButton
            aria-label="Open workspace navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
              {roleLabel}
            </Typography>
            <Typography
              component="div"
              variant="h6"
              sx={{ fontWeight: 950, lineHeight: 1.2 }}
              noWrap
            >
              {pageLabel}
            </Typography>
          </Box>
          {!pwa.online && <Chip size="small" color="warning" label="Offline" />}
          {pwa.updateAvailable && (
            <Button size="small" variant="outlined" onClick={pwa.applyUpdate}>
              Update
            </Button>
          )}
          <ThemeToggle compact />
          <Tooltip title={`${user.displayName} · ${roleLabel}`}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: '#07192d', color: '#f3c643' }}>
              {user.displayName.slice(0, 1).toUpperCase()}
            </Avatar>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        aria-label={
          user.capabilities.accessAdmin ? 'Administration navigation' : 'Workspace navigation'
        }
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, border: 0 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, border: 0, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          ml: { md: `${drawerWidth}px` },
          pt: { xs: '60px', md: '68px' },
          minHeight: '100dvh',
        }}
      >
        <Box sx={{ p: { xs: 1.5, sm: 2.5, lg: 4 }, maxWidth: 1600, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function WorkspaceIcon({ name }: { name: WorkspaceIconName }) {
  const paths: Record<WorkspaceIconName, React.ReactNode> = {
    dashboard: <path d="M4 4h6v7H4V4Zm10 0h6v4h-6V4ZM4 15h6v5H4v-5Zm10-3h6v8h-6v-8Z" />,
    competition: (
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Zm0 1H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 11v5m-4 4h8m-4-4c-2 0-3 1-3 4h6c0-3-1-4-3-4Z" />
    ),
    team: (
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20c0-4 2-6 5-6s5 2 5 6H3Zm10 0c0-3 1-5 3.5-5S21 17 21 20h-8Z" />
    ),
    people: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-4 2.5-6 7-6s7 2 7 6H5Z" />,
    fixture: <path d="M5 5h14v15H5V5Zm3-2v4m8-4v4M5 9h14m-11 4h3m2 0h3m-8 3h3" />,
    live: <path d="m9 8 7 4-7 4V8Zm-4-3a10 10 0 0 0 0 14m14 0a10 10 0 0 0 0-14" />,
    fantasy: <path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9L12 3Z" />,
    discipline: <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Zm0 5v5m0 3h.01" />,
    notification: <path d="M6 17h12l-2-3v-4a4 4 0 1 0-8 0v4l-2 3Zm4 2h4" />,
    provider: <path d="M8 12a4 4 0 0 1 4-4h3m-1-3 3 3-3 3M16 12a4 4 0 0 1-4 4H9m1 3-3-3 3-3" />,
    news: <path d="M5 4h14v16H5V4Zm3 4h8M8 12h8m-8 4h5" />,
    settings: (
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4" />
    ),
    site: <path d="M4 5h16v14H4V5Zm0 4h16M8 7h.01M11 7h.01" />,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}
