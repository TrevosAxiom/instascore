import { Alert, Button, Card, CardContent, Stack, TextField } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { PageScaffold } from '../../components/PageScaffold';

export function DisciplineAdminPage() {
  const api = useApi();
  const [form, setForm] = useState({
    competitionId: 1,
    seasonId: 1,
    playerId: 1,
    recordType: 'suspension',
    reason: '',
  });
  const mutation = useMutation({ mutationFn: () => api.createDisciplineRecord(form) });

  return (
    <PageScaffold
      eyebrow="Discipline"
      title="Discipline Administration"
      description="Audited warnings, penalties and suspension records."
      status="Administrator"
    >
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            {mutation.isSuccess && (
              <Alert severity="success">Discipline record created and audited.</Alert>
            )}
            {mutation.isError && <Alert severity="error">Record could not be created.</Alert>}
            <TextField
              label="Competition ID"
              type="number"
              value={form.competitionId}
              onChange={(event) => setForm({ ...form, competitionId: Number(event.target.value) })}
            />
            <TextField
              label="Season ID"
              type="number"
              value={form.seasonId}
              onChange={(event) => setForm({ ...form, seasonId: Number(event.target.value) })}
            />
            <TextField
              label="Player ID"
              type="number"
              value={form.playerId}
              onChange={(event) => setForm({ ...form, playerId: Number(event.target.value) })}
            />
            <TextField
              label="Record type"
              value={form.recordType}
              onChange={(event) => setForm({ ...form, recordType: event.target.value })}
            />
            <TextField
              label="Reason"
              multiline
              minRows={3}
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
            <Button
              variant="contained"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              Create audited record
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </PageScaffold>
  );
}
