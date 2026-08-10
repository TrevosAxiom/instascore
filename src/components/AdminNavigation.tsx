import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router';

import { useAuth } from '../app/auth-context';

const adminItems = [
  { label: 'Overview', path: '/admin', capability: 'accessAdmin' },
  { label: 'Competitions', path: '/admin/competitions', capability: 'manageCompetitions' },
  { label: 'Teams & Players', path: '/admin/teams', capability: 'manageTeams' },
  { label: 'People & Access', path: '/admin/accounts', capability: 'manageUsers' },
  { label: 'Fixtures', path: '/admin/fixtures', capability: 'manageFixtures' },
  { label: 'Fantasy', path: '/admin/fantasy', capability: 'manageLeagues' },
  { label: 'Discipline', path: '/admin/discipline', capability: 'manageFixtures' },
  { label: 'Notifications', path: '/admin/notifications', capability: 'accessAdmin' },
  { label: 'Providers', path: '/admin/providers', capability: 'accessAdmin' },
  { label: 'RSS News', path: '/admin/rss', capability: 'accessAdmin' },
  { label: 'Settings', path: '/admin/settings', capability: 'accessAdmin' },
  { label: 'Operations', path: '/operations', capability: 'accessOperations' },
] as const;

export function AdminNavigation() {
  const location = useLocation();
  const auth = useAuth();
  const capabilities = auth.state?.user?.capabilities;
  const visibleItems = adminItems.filter(
    (item) => capabilities?.[item.capability as keyof typeof capabilities],
  );

  if (!auth.state?.authenticated || visibleItems.length === 0) {
    return null;
  }

  return (
    <Box
      component="nav"
      aria-label="Administration navigation"
      sx={{
        mb: 3,
        p: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
        <Typography variant="overline" fontWeight={950} color="primary.dark" sx={{ px: 1 }}>
          Admin
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            overflowX: { xs: 'auto', md: 'visible' },
            flexWrap: { xs: 'nowrap', md: 'wrap' },
            pb: { xs: 0.5, md: 0 },
          }}
        >
          {visibleItems.map((item) => {
            const active =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);
            return (
              <Button
                key={item.path}
                component={RouterLink}
                to={item.path}
                size="small"
                variant={active ? 'contained' : 'outlined'}
                color={active ? 'primary' : 'inherit'}
                sx={{ borderRadius: 0, fontWeight: 900, flex: '0 0 auto' }}
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
