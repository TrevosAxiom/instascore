import { Alert, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';

import { PageScaffold } from '../components/PageScaffold';
import { usePwa } from '../pwa/PwaProvider';

export function InstallAppPage() {
  const pwa = usePwa();
  return (
    <PageScaffold
      eyebrow="InstaScore app"
      title="Install for match day"
      description="Get faster launches, full-screen navigation, offline access and app-style shortcuts on your device."
      status={pwa.standalone ? 'Installed' : 'Ready to install'}
    >
      {pwa.standalone && (
        <Alert severity="success">
          InstaScore is already running as an installed app on this device.
        </Alert>
      )}
      {!pwa.online && (
        <Alert severity="warning">
          You are offline. Cached scores and schedules remain available.
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        {pwa.installAvailable && !pwa.standalone && (
          <Button variant="contained" size="large" onClick={() => void pwa.promptInstall()}>
            Install InstaScore now
          </Button>
        )}
        {pwa.updateAvailable && (
          <Button variant="outlined" onClick={pwa.applyUpdate}>
            Update app now
          </Button>
        )}
        <Chip
          label={pwa.serviceWorkerRegistered ? 'Offline engine ready' : 'Browser-only mode'}
          color={pwa.serviceWorkerRegistered ? 'success' : 'default'}
        />
      </Stack>
      {!pwa.standalone && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h5" fontWeight={950}>
              {pwa.installGuide.label}
            </Typography>
            <Stack component="ol" spacing={1.5} sx={{ pl: 2.5, mb: 0 }}>
              {pwa.installGuide.steps.map((step) => (
                <Typography component="li" key={step}>
                  {step}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
      <Card sx={{ bgcolor: '#07192d', color: '#fff5d6' }}>
        <CardContent>
          <Typography variant="h5" fontWeight={950}>
            What the installed app adds
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              'One-tap launch from your home screen',
              'Cached schedules and recent scores offline',
              'Live-score and match-day shortcuts',
              'Standalone, distraction-free interface',
              'Push notification support where enabled',
              'Automatic background app updates',
            ].map((item) => (
              <Grid key={item} size={{ xs: 12, sm: 6 }}>
                <Typography>✓ {item}</Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </PageScaffold>
  );
}
