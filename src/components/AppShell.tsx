import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Toolbar,
} from '@mui/material';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router';

import { useAuth } from '../app/auth-context';
import logo from '../assets/instascore-logo-brand.png';
import { usePwa } from '../pwa/PwaProvider';
import { AdminNavigation } from './AdminNavigation';
import { NavigationIcon } from './NavigationIcon';
import { ThemeToggle } from './ThemeToggle';
import { SiteSwipeNavigator } from './SiteSwipeNavigator';
import { InstallHelper } from './InstallHelper';

const primaryNavigation = [
  { label: 'Scores', path: '/scores', icon: 'scores' },
  { label: 'Fixtures', path: '/fixtures', icon: 'fixtures' },
  { label: 'Results', path: '/results', icon: 'results' },
  { label: 'Tables', path: '/standings', icon: 'tables' },
  { label: 'More', path: '/more', icon: 'more' },
] as const;

const desktopNavigation = [
  ...primaryNavigation.slice(0, 4),
  { label: 'Competitions', path: '/competitions', icon: 'more' as const },
  { label: 'News', path: '/news', icon: 'more' as const },
] as const;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const pwa = usePwa();
  const isEmbedRoute = location.pathname.startsWith('/embed/');
  const isAdminRoute =
    location.pathname.startsWith('/admin') || location.pathname.startsWith('/operations');
  const activePath =
    primaryNavigation.find((item) => location.pathname.startsWith(item.path))?.path ?? false;

  if (isEmbedRoute) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
        <Outlet />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        pb: { xs: isAdminRoute ? 2 : 9, md: 0 },
      }}
    >
      <AppBar
        className="instascore-app-bar"
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          top: 0,
          bgcolor: pwa.standalone ? '#07192d' : 'background.paper',
          color: pwa.standalone ? '#fff5d6' : 'text.primary',
          borderBottom: '3px solid',
          borderColor: 'primary.main',
        }}
      >
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 6 } }}>
          <Toolbar disableGutters sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 54, md: 76 } }}>
            <Box
              component={RouterLink}
              to="/"
              aria-label="InstaScore home"
              sx={{ display: 'flex', alignItems: 'center', mr: 'auto' }}
            >
              <Box
                component="img"
                src={logo}
                alt="InstaScore"
                sx={{
                  width: { xs: 158, sm: 218, md: 250 },
                  height: { xs: 38, md: 52 },
                  objectFit: 'contain',
                  objectPosition: 'left center',
                }}
              />
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {desktopNavigation.map((item) => {
                const active = location.pathname.startsWith(item.path);
                return (
                  <Button
                    key={item.path}
                    component={RouterLink}
                    to={item.path}
                    sx={{
                      px: 1.75,
                      color: active ? 'secondary.main' : 'text.primary',
                      borderRadius: 0,
                      borderBottom: active ? '3px solid' : '3px solid transparent',
                      borderColor: active ? 'primary.main' : 'transparent',
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>

            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <ThemeToggle />
            </Box>
            <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
              <ThemeToggle compact />
            </Box>
            <Button
              component={RouterLink}
              to={auth.state?.authenticated ? '/dashboard' : '/login'}
              aria-label={
                auth.state?.authenticated
                  ? `Open ${auth.state.user?.displayName} account`
                  : 'Sign in'
              }
              sx={{ minWidth: 0, p: 0.25, borderRadius: 99 }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'secondary.main',
                  color: 'primary.main',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  fontWeight: 950,
                }}
              >
                {auth.state?.user?.displayName.slice(0, 1).toUpperCase() ?? 'G'}
              </Avatar>
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container
        maxWidth={false}
        component="main"
        sx={{ width: '100%', flex: 1, px: { xs: 1.25, sm: 2, md: 6 }, py: { xs: 1.25, md: 4 } }}
      >
        <Stack spacing={1} sx={{ mb: 2 }}>
          {!pwa.online && (
            <Chip
              color="warning"
              label="Offline mode — cached data and queued scoring are active"
              sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
            />
          )}
          {pwa.online && pwa.lastUpdatedAt && (
            <Chip
              variant="outlined"
              label={`Last updated ${new Date(pwa.lastUpdatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
              sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
            />
          )}
          {!isEmbedRoute && <InstallHelper />}
          {pwa.updateAvailable && (
            <Button variant="outlined" onClick={pwa.applyUpdate} sx={{ alignSelf: 'flex-start' }}>
              Update InstaScore
            </Button>
          )}
        </Stack>
        {isAdminRoute && <AdminNavigation />}
        <Outlet />
      </Container>

      <Box
        component="footer"
        sx={{
          mt: { xs: 2, md: 6 },
          px: { xs: 2, md: 6 },
          py: { xs: 2, md: 4 },
          bgcolor: '#07192d',
          color: '#fff5d6',
          borderTop: '4px solid',
          borderColor: 'primary.main',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Box
              component={RouterLink}
              to="/"
              sx={{ color: '#fff5d6', fontSize: 24, fontWeight: 950, letterSpacing: '-.04em' }}
            >
              InstaScore
            </Box>
            <Box component="p" sx={{ m: 0, mt: 1, color: 'rgba(255,245,214,.68)', fontSize: 14 }}>
              © {new Date().getFullYear()} InstaScore. All rights reserved.
            </Box>
            <Box
              component="p"
              sx={{ m: 0, mt: 0.5, color: '#f3c643', fontSize: 13, fontWeight: 850 }}
            >
              Powered by Lagos Wolverines
            </Box>
          </Box>
          <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }} flexWrap="wrap">
            <Button component={RouterLink} to="/scores" sx={{ color: '#fff5d6', px: 0 }}>
              Scores
            </Button>
            <Button component={RouterLink} to="/competitions" sx={{ color: '#fff5d6', px: 0 }}>
              Competitions
            </Button>
            <Button component={RouterLink} to="/news" sx={{ color: '#fff5d6', px: 0 }}>
              News
            </Button>
            <Button component={RouterLink} to="/contact" sx={{ color: '#fff5d6', px: 0 }}>
              Contact
            </Button>
            <Button component={RouterLink} to="/more" sx={{ color: '#fff5d6', px: 0 }}>
              More
            </Button>
          </Stack>
        </Stack>
      </Box>

      {!isAdminRoute ? (
        <BottomNavigation
          component="nav"
          showLabels
          value={activePath}
          onChange={(_event, value: string) => void navigate(value)}
          aria-label="Primary navigation"
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            zIndex: 1200,
            left: 0,
            right: 0,
            bottom: 0,
            height: 72,
            borderTop: '3px solid',
            borderColor: 'primary.main',
            bgcolor: 'background.paper',
            '& .MuiBottomNavigationAction-root': {
              color: '#07192d',
              minWidth: 0,
              fontWeight: 900,
            },
            '& .Mui-selected': { color: '#07192d' },
          }}
        >
          {primaryNavigation.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              value={item.path}
              icon={<NavigationIcon name={item.icon} />}
            />
          ))}
        </BottomNavigation>
      ) : null}
      {!isAdminRoute ? <SiteSwipeNavigator /> : null}
    </Box>
  );
}
