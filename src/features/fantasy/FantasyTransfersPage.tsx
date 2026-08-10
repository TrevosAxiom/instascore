import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { PageScaffold } from '../../components/PageScaffold';

const demoGameUuid = '00000000-0000-4000-8000-000000000120';

export function FantasyTransfersPage() {
  const api = useApi();
  const [inPlayerId, setInPlayerId] = useState('1');
  const transfer = useMutation({
    mutationFn: () =>
      api.makeFantasyTransfer(demoGameUuid, {
        gameweekId: 1,
        squadId: 1,
        inFantasyPlayerId: Number(inPlayerId),
        paid: false,
        baseRevision: 1,
      }),
  });

  return (
    <PageScaffold
      eyebrow="Fantasy"
      title="Transfer market"
      description="Use free transfers before deadline or spend points for additional moves."
      status="Fantasy"
    >
      <Box className="instascore-panel">
        <Stack spacing={2}>
          <Typography variant="h3">Make transfer</Typography>
          <TextField
            label="Incoming fantasy player internal ID"
            value={inPlayerId}
            onChange={(event) => setInPlayerId(event.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => transfer.mutate()}
            disabled={transfer.isPending}
          >
            Confirm transfer
          </Button>
          {transfer.data ? (
            <Alert severity="success">
              Transfer saved · cost {transfer.data.costPoints} points
            </Alert>
          ) : null}
          {transfer.isError ? (
            <Alert severity="error">Transfer rejected by deadline, cost or validation rules.</Alert>
          ) : null}
        </Stack>
      </Box>
    </PageScaffold>
  );
}
