import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { PageScaffold } from '../../components/PageScaffold';

export function AdminFantasyPage() {
  const api = useApi();
  const [name, setName] = useState('InstaScore Fantasy');
  const [sportId, setSportId] = useState('1');
  const [budget, setBudget] = useState('100000');
  const create = useMutation({
    mutationFn: () =>
      api.createFantasyGame({
        name,
        sportId: Number(sportId),
        budgetCents: Number(budget),
        squadSize: 15,
        startingSize: 7,
        benchSize: 8,
        maxPlayersPerTeam: 3,
        status: 'draft',
        formationRules: { foundation: true },
      }),
  });

  return (
    <PageScaffold
      eyebrow="Fantasy admin"
      title="Fantasy game setup"
      description="Create fantasy games, set budgets and configure squad constraints."
      status="Administrator"
    >
      <Box className="instascore-panel">
        <Stack spacing={2}>
          <Typography variant="h3">Game settings</Typography>
          <TextField
            label="Game name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Sport internal ID"
            value={sportId}
            onChange={(event) => setSportId(event.target.value)}
          />
          <TextField
            label="Budget cents"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
          <Button variant="contained" disabled={create.isPending} onClick={() => create.mutate()}>
            Create fantasy game
          </Button>
          {create.data ? (
            <Alert severity="success">Fantasy game created: {create.data.name}</Alert>
          ) : null}
          {create.isError ? (
            <Alert severity="error">Fantasy game could not be created.</Alert>
          ) : null}
        </Stack>
      </Box>
    </PageScaffold>
  );
}
