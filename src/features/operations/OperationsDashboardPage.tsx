import {
  Alert,
  Box,
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
import { useMemo, useState } from 'react';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import type { OperationsDashboard, OperationsSettings } from '../../types/api';

const summaryLabels: Record<keyof OperationsDashboard['summary'], string> = {
  competitions: 'Competitions',
  activeLiveFixtures: 'Active live fixtures',
  resultsAwaitingConfirmation: 'Results awaiting confirmation',
  providerFailures: 'Provider failures',
  notificationFailures: 'Notification failures',
  offlineSyncConflicts: 'Offline-sync conflicts',
  eventConflicts: 'Event conflicts',
  openAlerts: 'Open alerts',
};

export function OperationsDashboardPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const dashboard = useQuery({
    queryKey: ['operations-dashboard'],
    queryFn: api.getOperationsDashboard,
  });

  const settingsMutation = useMutation({
    mutationFn: (input: Partial<OperationsSettings>) => api.updateOperationsSettings(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] }),
  });

  const actionMutation = useMutation({
    mutationFn: (action: Parameters<typeof api.runOperationsAction>[0]) =>
      api.runOperationsAction(action, { source: 'operations_dashboard' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operations-dashboard'] }),
  });

  const exportMutation = useMutation({
    mutationFn: (type: string) => api.exportOperations(type),
    onSuccess: (result) => {
      if (typeof URL.createObjectURL !== 'function') return;
      const url = URL.createObjectURL(
        new Blob([result.content], { type: result.mimeType ?? 'text/csv' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  const filteredLogs = useMemo(() => {
    if (!dashboard.data) return {};
    const term = filter.trim().toLowerCase();
    if (!term) return dashboard.data.logs;
    return Object.fromEntries(
      Object.entries(dashboard.data.logs).map(([section, rows]) => [
        section,
        rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term)),
      ]),
    );
  }, [dashboard.data, filter]);

  if (dashboard.isLoading) return <LoadingState label="Loading operations dashboard" />;
  if (dashboard.isError || !dashboard.data) {
    return <ErrorState description="The operations control room could not be loaded." />;
  }

  const { summary, settings, healthReport } = dashboard.data;

  return (
    <PageScaffold
      eyebrow="Administration"
      title="Operations Control Room"
      description="Monitor live operations, provider jobs, notifications, audit trails, exports and emergency controls from one protected console."
      status={settings.maintenanceMode ? 'Maintenance mode on' : 'Operational'}
    >
      <Stack spacing={3}>
        <Alert severity="info">
          Logs and diagnostic exports are redacted before they reach the browser. Secrets, tokens,
          cookies, nonces and large payloads are never shown raw here.
        </Alert>

        {summary.providerFailures > 0 &&
        !settings.providerSettings.football.apiKeyConfigured &&
        !settings.providerSettings.basketball.apiKeyConfigured ? (
          <Alert severity="warning">
            Provider jobs are failing because no football or basketball API key is configured. Add
            provider credentials in Settings, or turn provider synchronisation off until the
            integration is ready.
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          {Object.entries(summary).map(([key, value]) => (
            <Grid key={key} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    {summaryLabels[key as keyof typeof summaryLabels]}
                  </Typography>
                  <Typography variant="h4" fontWeight={950}>
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Operational controls</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={(_, checked) =>
                        settingsMutation.mutate({ maintenanceMode: checked })
                      }
                    />
                  }
                  label="Maintenance mode"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emergencyNotificationsDisabled}
                      onChange={(_, checked) =>
                        settingsMutation.mutate({ emergencyNotificationsDisabled: checked })
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
                    settingsMutation.mutate({ dataRetentionDays: Number(event.target.value) })
                  }
                />
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(settings.featureFlags).map(([flag, enabled]) => (
                  <Chip
                    key={flag}
                    label={`${flag}: ${enabled ? 'on' : 'off'}`}
                    color={enabled ? 'success' : 'default'}
                    onClick={() =>
                      settingsMutation.mutate({
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
              <Typography variant="h6">Manual operations</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <Button
                  onClick={() => actionMutation.mutate('production_preflight')}
                  variant="contained"
                >
                  Run production preflight
                </Button>
                <Button
                  onClick={() => actionMutation.mutate('runtime_cache_purge')}
                  variant="outlined"
                >
                  Clear runtime cache
                </Button>
                <Button
                  onClick={() => {
                    if (window.confirm('Confirm that a restorable host-level backup has been checked.'))
                      actionMutation.mutate('verify_backup');
                  }}
                  variant="outlined"
                >
                  Mark backup verified
                </Button>
                <Button
                  onClick={() => actionMutation.mutate('retry_failed_jobs')}
                  variant="outlined"
                >
                  Retry failed jobs
                </Button>
                <Button
                  onClick={() => actionMutation.mutate('database_integrity_scan')}
                  variant="outlined"
                >
                  Scan database integrity
                </Button>
                <Button onClick={() => actionMutation.mutate('security_audit')} variant="outlined">
                  Audit role security
                </Button>
                <Button
                  onClick={() => actionMutation.mutate('security_capability_repair')}
                  variant="outlined"
                >
                  Restore required capabilities
                </Button>
                <Button
                  onClick={() => actionMutation.mutate('database_retention_cleanup')}
                  variant="outlined"
                  color="warning"
                >
                  Clean expired operational data
                </Button>
                <Button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Repair unusable orphan registrations and incomplete provider rows? Primary teams, players, competitions and fixtures will be preserved.',
                      )
                    )
                      actionMutation.mutate('database_safe_repair');
                  }}
                  variant="outlined"
                  color="error"
                >
                  Repair unusable records
                </Button>
                <Button
                  onClick={() => actionMutation.mutate('standings_rebuild')}
                  variant="outlined"
                >
                  Manual standings rebuild
                </Button>
                <Button
                  onClick={() => actionMutation.mutate('fantasy_recalculation')}
                  variant="outlined"
                >
                  Manual fantasy recalculation
                </Button>
                <Button
                  onClick={() => exportMutation.mutate('diagnostic_report')}
                  variant="contained"
                >
                  Download diagnostic report
                </Button>
                <Button
                  onClick={() => exportMutation.mutate('database_integrity')}
                  variant="outlined"
                >
                  Export integrity CSV
                </Button>
                <Button
                  onClick={() => exportMutation.mutate('recovery_manifest')}
                  variant="outlined"
                >
                  Download recovery manifest
                </Button>
              </Stack>
              {actionMutation.data && (
                <Alert severity="success">
                  {actionMutation.data.message ?? actionMutation.data.status}
                </Alert>
              )}
              {exportMutation.data && (
                <Alert severity="success">
                  {exportMutation.data.filename} prepared with secrets redacted.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">System health report</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(healthReport)
                  .filter(
                    ([key]) =>
                      ![
                        'providerPolling',
                        'providerWatchdog',
                        'databaseMaintenance',
                        'security',
                        'productionReadiness',
                      ].includes(key),
                  )
                  .map(([key, value]) => (
                    <Chip key={key} label={`${key}: ${String(value)}`} />
                  ))}
              </Stack>
              {healthReport.providerPolling && typeof healthReport.providerPolling === 'object' ? (
                <Grid container spacing={1.5}>
                  {Object.entries(
                    healthReport.providerPolling as Record<string, Record<string, unknown>>,
                  ).map(([sport, health]) => (
                    <Grid key={sport} size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Typography fontWeight={900} textTransform="capitalize">
                          {sport} polling
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Status: {typeof health.status === 'string' ? health.status : 'unknown'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Next live:{' '}
                          {typeof health.nextLiveAt === 'string'
                            ? health.nextLiveAt
                            : 'not scheduled'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active locks:{' '}
                          {
                            Object.keys((health.activeLocks as Record<string, unknown>) ?? {})
                              .length
                          }
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : null}
              {healthReport.providerWatchdog &&
              typeof healthReport.providerWatchdog === 'object' ? (
                <Alert severity="info">
                  Provider watchdog last checked:{' '}
                  {typeof (healthReport.providerWatchdog as Record<string, unknown>).checkedAt ===
                  'string'
                    ? String((healthReport.providerWatchdog as Record<string, unknown>).checkedAt)
                    : 'waiting for its first run'}
                </Alert>
              ) : null}
              {healthReport.databaseMaintenance &&
              typeof healthReport.databaseMaintenance === 'object' ? (
                <Alert
                  severity={
                    (
                      healthReport.databaseMaintenance as {
                        integrity?: { status?: string };
                      }
                    ).integrity?.status === 'attention'
                      ? 'warning'
                      : 'success'
                  }
                >
                  Database integrity:{' '}
                  {(
                    healthReport.databaseMaintenance as {
                      integrity?: { status?: string; issueCount?: number };
                    }
                  ).integrity?.status ?? 'not run'}
                  {' · '}Issues:{' '}
                  {(
                    healthReport.databaseMaintenance as {
                      integrity?: { issueCount?: number };
                    }
                  ).integrity?.issueCount ?? 0}
                </Alert>
              ) : null}
              {healthReport.security && typeof healthReport.security === 'object' ? (
                <Alert
                  severity={
                    (healthReport.security as { status?: string }).status === 'attention'
                      ? 'warning'
                      : 'success'
                  }
                >
                  Role security:{' '}
                  {(healthReport.security as { status?: string }).status ?? 'not run'}
                  {' · '}Missing required capabilities:{' '}
                  {(healthReport.security as { missingCount?: number }).missingCount ?? 0}
                </Alert>
              ) : null}
              {healthReport.productionReadiness &&
              typeof healthReport.productionReadiness === 'object' ? (
                <Alert
                  severity={
                    (healthReport.productionReadiness as { status?: string }).status === 'ready'
                      ? 'success'
                      : 'warning'
                  }
                >
                  Production readiness:{' '}
                  {(healthReport.productionReadiness as { status?: string }).status ?? 'not run'}
                  {' · '}
                  {(healthReport.productionReadiness as { readyCount?: number }).readyCount ?? 0}/
                  {(healthReport.productionReadiness as { checkCount?: number }).checkCount ?? 6}{' '}
                  checks ready
                </Alert>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <TextField
          label="Search operational logs"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="provider, failed, conflict, redacted..."
        />

        {Object.entries(filteredLogs).map(([section, rows]) => (
          <Card key={section}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">{section}</Typography>
                {rows.length === 0 ? (
                  <Typography color="text.secondary">No matching records.</Typography>
                ) : (
                  rows.slice(0, 5).map((row, index) => (
                    <Box
                      key={`${section}-${index}`}
                      sx={{
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <Typography
                        component="pre"
                        variant="body2"
                        sx={{ m: 0, whiteSpace: 'pre-wrap' }}
                      >
                        {JSON.stringify(row, null, 2)}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </PageScaffold>
  );
}
