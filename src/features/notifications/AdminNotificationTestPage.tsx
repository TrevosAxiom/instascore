import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { PageScaffold } from '../../components/PageScaffold';

export function AdminNotificationTestPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('team_news');
  const status = useQuery({
    queryKey: ['admin-notifications-status'],
    queryFn: api.getNotificationAdminStatus,
  });
  const testSend = useMutation({
    mutationFn: () =>
      api.adminTestNotification({
        title: 'InstaScore test',
        body: 'Admin test push from InstaScore.',
        category,
        launchUrl: '/scores',
      }),
  });
  const processQueue = useMutation({
    mutationFn: api.processNotificationQueue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications-status'] }),
  });

  return (
    <PageScaffold
      eyebrow="Admin"
      title="Push notification test"
      description="Send a controlled push to your own signed-in OneSignal identity."
      status="Administrator"
    >
      <Stack spacing={2}>
        <Box className="instascore-panel">
          <Stack spacing={2}>
            <Typography variant="h3">Delivery health</Typography>
            {status.isError ? (
              <Alert severity="error">Notification health could not be loaded.</Alert>
            ) : null}
            {status.data ? (
              <>
                {!status.data.configured ? (
                  <Alert severity="warning">OneSignal server credentials are not configured.</Alert>
                ) : null}
                {status.data.disabled ? (
                  <Alert severity="warning">The emergency notification stop is active.</Alert>
                ) : null}
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Chip label={`${status.data.subscriptions} active devices`} color="primary" />
                  {Object.entries(status.data.counts).map(([label, count]) => (
                    <Chip
                      key={label}
                      label={`${label}: ${count}`}
                      color={label === 'failed' && count ? 'error' : 'default'}
                    />
                  ))}
                </Stack>
                <Typography color="text.secondary">
                  Worker:{' '}
                  {status.data.workerNextAt
                    ? new Date(status.data.workerNextAt).toLocaleString()
                    : 'not scheduled'}{' '}
                  · Reminders:{' '}
                  {status.data.remindersNextAt
                    ? new Date(status.data.remindersNextAt).toLocaleString()
                    : 'not scheduled'}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => processQueue.mutate()}
                  disabled={processQueue.isPending}
                >
                  {processQueue.isPending ? 'Processing…' : 'Process queue now'}
                </Button>
              </>
            ) : null}
          </Stack>
        </Box>
        <Box className="instascore-panel">
          <Stack spacing={2}>
            {testSend.isSuccess ? <Alert severity="success">Test send accepted.</Alert> : null}
            {testSend.isError ? <Alert severity="error">Test send failed.</Alert> : null}
            <TextField
              select
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <MenuItem value="team_news">Team news</MenuItem>
              <MenuItem value="fixture_change">Fixture changes</MenuItem>
              <MenuItem value="provider_failure">Provider failure</MenuItem>
            </TextField>
            <Button
              variant="contained"
              onClick={() => testSend.mutate()}
              disabled={testSend.isPending}
            >
              Send test push
            </Button>
          </Stack>
        </Box>
      </Stack>
    </PageScaffold>
  );
}
