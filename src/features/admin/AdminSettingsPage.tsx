import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import type { OperationsSettings } from '../../types/api';

const setupLinks = [
  ['Branding and theme', 'Logo-first light/dark theme controls live in the app shell.', '/'],
  [
    'Provider APIs',
    'Configure server constants, then verify health and sync logs.',
    '/admin/providers',
  ],
  [
    'Push notifications',
    'Check OneSignal worker paths, test send and preference categories.',
    '/admin/notifications',
  ],
  [
    'Operations',
    'Review failed jobs, conflicts, audit logs and diagnostic exports.',
    '/operations',
  ],
] as const;

export function AdminSettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['operations-dashboard'],
    queryFn: api.getOperationsDashboard,
  });
  const mutation = useMutation({
    mutationFn: (input: Partial<OperationsSettings>) => api.updateOperationsSettings(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] }),
  });
  const actionMutation = useMutation({
    mutationFn: ({
      action,
      input,
    }: {
      action: Parameters<typeof api.runOperationsAction>[0];
      input?: Record<string, unknown>;
    }) => api.runOperationsAction(action, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] }),
  });
  const [footballDraft, setFootballDraft] = useState<
    OperationsSettings['providerSettings']['football']
  >({
    providerName: 'approved_football_provider',
    baseUrl: '',
    apiKeyConfigured: false,
    pollingEnabled: false,
    liveIntervalSeconds: 60,
    leagueIds: [],
    apiKey: '',
  });
  const [basketballDraft, setBasketballDraft] = useState<
    OperationsSettings['providerSettings']['basketball']
  >({
    providerName: 'approved_basketball_provider',
    baseUrl: '',
    apiKeyConfigured: false,
    pollingEnabled: false,
    liveIntervalSeconds: 60,
    leagueIds: [],
    apiKey: '',
  });
  const [oneSignalDraft, setOneSignalDraft] = useState<OperationsSettings['oneSignalSettings']>({
    appIdConfigured: false,
    restKeyConfigured: false,
    environmentOverride: false,
    appId: '',
    restApiKey: '',
    clearAppId: false,
    clearRestApiKey: false,
  });

  useEffect(() => {
    if (!query.data?.settings.providerSettings) return;
    setFootballDraft({ ...query.data.settings.providerSettings.football, apiKey: '' });
    setBasketballDraft({ ...query.data.settings.providerSettings.basketball, apiKey: '' });
  }, [query.data?.settings.providerSettings]);

  useEffect(() => {
    if (!query.data?.settings.oneSignalSettings) return;
    setOneSignalDraft({
      ...query.data.settings.oneSignalSettings,
      appId: '',
      restApiKey: '',
      clearAppId: false,
      clearRestApiKey: false,
    });
  }, [query.data?.settings.oneSignalSettings]);

  if (query.isLoading) return <LoadingState label="Loading settings" />;
  if (query.isError || !query.data) {
    return <ErrorState description="Settings could not be loaded." />;
  }

  const settings = query.data.settings;

  const saveProviderSettings = () =>
    mutation.mutate({
      providerSettings: {
        football: footballDraft,
        basketball: basketballDraft,
      },
    });

  return (
    <PageScaffold
      eyebrow="Administration"
      title="Settings"
      description="Configure platform-wide operational controls, feature flags, launch readiness and safe links to provider, notification and PWA setup."
      status="Admin settings"
    >
      <Stack spacing={3}>
        <Alert severity="info">
          Provider and notification credentials are stored server-side behind the protected admin
          API. This page exposes status and safe controls only — saved provider keys are never sent
          back to the browser, and neither are saved OneSignal credentials.
        </Alert>
        <Alert severity="success">
          Public pages read canonical competitions, teams, players, fixtures, results and standings
          from the InstaScore database. Provider polling runs server-side; normalized responses,
          mappings and last-known live data are persisted before the browser can read them.
          Third-party API keys and direct provider calls never reach public users.
        </Alert>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack spacing={0.5}>
                  <Typography variant="h6">CFFL Lagos workspace</Typography>
                  <Typography color="text.secondary">
                    Create the CFFL Lagos competition workspace, starter teams, seed fixtures and
                    role accounts. Team logos are generated placeholders until official assets are
                    uploaded.
                  </Typography>
                </Stack>
                <Button
                  variant="contained"
                  onClick={() =>
                    actionMutation.mutate({
                      action: 'bootstrap_cffl_lagos',
                      input: { source: 'admin_settings' },
                    })
                  }
                  sx={{ borderRadius: 0, whiteSpace: 'nowrap' }}
                >
                  Bootstrap CFFL Lagos
                </Button>
              </Stack>
              {actionMutation.data?.message && (
                <Alert severity={actionMutation.data.status === 'failed' ? 'error' : 'success'}>
                  {actionMutation.data.message}
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Platform controls</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={(_, checked) => mutation.mutate({ maintenanceMode: checked })}
                    />
                  }
                  label="Maintenance mode"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emergencyNotificationsDisabled}
                      onChange={(_, checked) =>
                        mutation.mutate({ emergencyNotificationsDisabled: checked })
                      }
                    />
                  }
                  label="Emergency disable automated notifications"
                />
                <TextField
                  label="Data retention days"
                  type="number"
                  size="small"
                  defaultValue={settings.dataRetentionDays}
                  onBlur={(event) =>
                    mutation.mutate({ dataRetentionDays: Number(event.target.value) })
                  }
                />
              </Stack>
              {mutation.isSuccess && <Alert severity="success">Settings saved.</Alert>}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Feature flags</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(settings.featureFlags).map(([flag, enabled]) => (
                  <Chip
                    key={flag}
                    label={`${flag}: ${enabled ? 'on' : 'off'}`}
                    color={enabled ? 'success' : 'default'}
                    onClick={() =>
                      mutation.mutate({
                        featureFlags: { ...settings.featureFlags, [flag]: !enabled },
                      })
                    }
                  />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Football and basketball API polling</Typography>
              <Typography color="text.secondary">
                Add API-Sports keys and league IDs, then poll live matches and scores through the
                normalized provider pipeline into the database. Service endpoints are managed by
                InstaScore automatically.
              </Typography>
              <Grid container spacing={2}>
                <ProviderSettingsCard
                  label="Football API"
                  configured={settings.providerSettings.football.apiKeyConfigured}
                  values={footballDraft}
                  onChange={setFootballDraft}
                  onPoll={() =>
                    actionMutation.mutate({
                      action: 'football_live_sync',
                      input: { source: 'admin_settings' },
                    })
                  }
                />
                <ProviderSettingsCard
                  label="Basketball API"
                  configured={settings.providerSettings.basketball.apiKeyConfigured}
                  values={basketballDraft}
                  onChange={setBasketballDraft}
                  onPoll={() =>
                    actionMutation.mutate({
                      action: 'basketball_live_sync',
                      input: { source: 'admin_settings' },
                    })
                  }
                />
              </Grid>
              <Button
                variant="contained"
                onClick={saveProviderSettings}
                sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
              >
                Save provider settings
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
              >
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  OneSignal push notifications
                </Typography>
                <Chip
                  size="small"
                  color={oneSignalDraft.appIdConfigured ? 'success' : 'warning'}
                  label={oneSignalDraft.appIdConfigured ? 'App ID configured' : 'App ID missing'}
                />
                <Chip
                  size="small"
                  color={oneSignalDraft.restKeyConfigured ? 'success' : 'warning'}
                  label={
                    oneSignalDraft.restKeyConfigured ? 'REST key configured' : 'REST key missing'
                  }
                />
              </Stack>
              <Typography color="text.secondary">
                Enter credentials here instead of editing plugin files. Existing values remain
                masked and are never returned to the browser.
              </Typography>
              {oneSignalDraft.environmentOverride && (
                <Alert severity="info">
                  OneSignal credentials are controlled by server constants or environment variables,
                  so these fields are read-only.
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label="OneSignal App ID"
                    value={oneSignalDraft.appId ?? ''}
                    disabled={oneSignalDraft.environmentOverride}
                    placeholder={
                      oneSignalDraft.appIdConfigured
                        ? 'Leave blank to keep current App ID'
                        : 'Paste OneSignal App ID'
                    }
                    onChange={(event) =>
                      setOneSignalDraft({ ...oneSignalDraft, appId: event.target.value })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label="OneSignal REST API key"
                    value={oneSignalDraft.restApiKey ?? ''}
                    disabled={oneSignalDraft.environmentOverride}
                    placeholder={
                      oneSignalDraft.restKeyConfigured
                        ? 'Leave blank to keep current REST key'
                        : 'Paste OneSignal REST API key'
                    }
                    onChange={(event) =>
                      setOneSignalDraft({ ...oneSignalDraft, restApiKey: event.target.value })
                    }
                  />
                </Grid>
              </Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(oneSignalDraft.clearAppId)}
                      disabled={oneSignalDraft.environmentOverride}
                      onChange={(_, checked) =>
                        setOneSignalDraft({ ...oneSignalDraft, clearAppId: checked })
                      }
                    />
                  }
                  label="Clear saved App ID"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(oneSignalDraft.clearRestApiKey)}
                      disabled={oneSignalDraft.environmentOverride}
                      onChange={(_, checked) =>
                        setOneSignalDraft({ ...oneSignalDraft, clearRestApiKey: checked })
                      }
                    />
                  }
                  label="Clear saved REST key"
                />
              </Stack>
              <Button
                variant="contained"
                disabled={oneSignalDraft.environmentOverride || mutation.isPending}
                onClick={() => mutation.mutate({ oneSignalSettings: oneSignalDraft })}
                sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
              >
                Save OneSignal settings
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          {setupLinks.map(([title, description, path]) => (
            <Grid key={title} size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="h6">{title}</Typography>
                    <Typography color="text.secondary">{description}</Typography>
                    <Button
                      component={RouterLink}
                      to={path}
                      variant="outlined"
                      sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
                    >
                      Open
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </PageScaffold>
  );
}

interface ProviderSettingsCardProps {
  label: string;
  configured: boolean;
  values: OperationsSettings['providerSettings']['football'];
  onChange: (values: OperationsSettings['providerSettings']['football']) => void;
  onPoll: () => void;
}

function ProviderSettingsCard({
  label,
  configured,
  values,
  onChange,
  onPoll,
}: ProviderSettingsCardProps) {
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={800}>
                {label}
              </Typography>
              <Chip
                label={configured ? 'API key configured' : 'No API key'}
                color={configured ? 'success' : 'warning'}
                size="small"
              />
            </Stack>
            <TextField
              label="API key"
              type="password"
              value={values.apiKey ?? ''}
              placeholder={configured ? 'Leave blank to keep current key' : 'Paste provider key'}
              onChange={(event) => onChange({ ...values, apiKey: event.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="League IDs"
              value={(values.leagueIds ?? []).join(', ')}
              placeholder="e.g. 39, 140, 253"
              helperText="Comma-separated provider league IDs. Scheduled and manual syncs are restricted to these leagues."
              onChange={(event) =>
                onChange({
                  ...values,
                  leagueIds: event.target.value
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
              fullWidth
              size="small"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={values.pollingEnabled}
                    onChange={(_, checked) => onChange({ ...values, pollingEnabled: checked })}
                  />
                }
                label="Poll live scores"
              />
              <TextField
                label="Live interval seconds"
                type="number"
                size="small"
                value={values.liveIntervalSeconds}
                onChange={(event) =>
                  onChange({ ...values, liveIntervalSeconds: Number(event.target.value) })
                }
                sx={{ maxWidth: 220 }}
              />
            </Stack>
            <Button
              variant="outlined"
              onClick={onPoll}
              sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
            >
              Poll live scores now
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}
