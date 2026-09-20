import { Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { useApi } from '../api/context';
import { useAuth } from '../app/auth-context';
import { PageScaffold } from '../components/PageScaffold';
import { ThemeToggle } from '../components/ThemeToggle';
import { usePwa } from '../pwa/PwaProvider';
import { publicNavigation, publicNavigationGroups } from '../app/navigation';

export function MorePage() {
  const { state } = useAuth();
  const api = useApi();
  const client = useQueryClient();
  const navigate = useNavigate();
  const pwa = usePwa();
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['auth', 'status'] });
      void navigate('/');
    },
  });

  return (
    <PageScaffold
      eyebrow="Explore"
      title="More"
      description="Teams, competitions, account preferences and platform tools in one place."
    >
      {publicNavigationGroups.map((group) => {
        const items = publicNavigation.filter(
          (item) => item.group === group && (!item.requiresAuth || state?.authenticated),
        );
        return (
          <Stack key={group} spacing={1.5}>
            <Typography variant="h5" fontWeight={950}>
              {group}
            </Typography>
            <Grid container spacing={1.5}>
              {items.map(({ label: title, path, description }) => (
                <Grid key={path} size={{ xs: 6, sm: 4, lg: 3 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={950}>
                        {title}
                      </Typography>
                      <Typography color="text.secondary" sx={{ my: 1 }}>
                        {description}
                      </Typography>
                      <Button component={RouterLink} to={path} variant="outlined">
                        Open {title}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        );
      })}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={950}>
              Appearance
            </Typography>
            <ThemeToggle />
          </Stack>
        </CardContent>
      </Card>

      {pwa.standalone && (
        <Card sx={{ bgcolor: '#07192d', color: '#fff5d6' }}>
          <CardContent>
            <Stack spacing={2}>
              <div>
                <Typography variant="h5" fontWeight={950}>
                  Native app controls
                </Typography>
                <Typography sx={{ color: 'rgba(255,245,214,.72)', mt: 0.5 }}>
                  InstaScore is running standalone with device capabilities enabled.
                </Typography>
              </div>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip
                  label={pwa.online ? 'Online' : 'Offline cache'}
                  color={pwa.online ? 'success' : 'warning'}
                />
                {pwa.nativeCapabilities.push && <Chip label="Push ready" color="primary" />}
                {pwa.serviceWorkerRegistered && (
                  <Chip label="Offline engine ready" color="primary" />
                )}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {pwa.nativeCapabilities.share && (
                  <Button variant="contained" onClick={() => void pwa.share()}>
                    Share InstaScore
                  </Button>
                )}
                {pwa.nativeCapabilities.wakeLock && (
                  <Button
                    variant="outlined"
                    sx={{ color: '#fff5d6', borderColor: '#f3c643' }}
                    onClick={() => void pwa.setWakeLock(!pwa.wakeLockActive)}
                  >
                    {pwa.wakeLockActive ? 'Allow screen to sleep' : 'Keep screen awake'}
                  </Button>
                )}
                <Button
                  component={RouterLink}
                  to="/notifications"
                  variant="outlined"
                  sx={{ color: '#fff5d6', borderColor: '#f3c643' }}
                >
                  Notification controls
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {state?.authenticated && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
              <div>
                <Typography variant="h5" fontWeight={950}>
                  {state.user?.displayName}
                </Typography>
                <Typography color="text.secondary">
                  Signed in · favourites and preferences sync across devices
                </Typography>
              </div>
              <Button
                variant="outlined"
                color="error"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                Sign out
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {state?.user?.capabilities.accessAdmin ? (
        <Button component={RouterLink} to="/admin" variant="contained">
          Open platform administration
        </Button>
      ) : null}
    </PageScaffold>
  );
}
