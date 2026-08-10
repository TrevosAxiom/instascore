import { Alert, Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { PageScaffold } from '../../components/PageScaffold';

export function AdminNotificationTestPage() {
  const api = useApi();
  const [category, setCategory] = useState('team_news');
  const testSend = useMutation({
    mutationFn: () =>
      api.adminTestNotification({
        title: 'InstaScore test',
        body: 'Admin test push from InstaScore.',
        category,
        launchUrl: '/scores',
      }),
  });

  return (
    <PageScaffold
      eyebrow="Admin"
      title="Push notification test"
      description="Send a controlled push to your own signed-in OneSignal identity."
      status="Administrator"
    >
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
    </PageScaffold>
  );
}
