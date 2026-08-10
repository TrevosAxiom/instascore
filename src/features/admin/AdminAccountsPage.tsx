import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ApiError } from '../../api/client';
import { useApi } from '../../api/context';
import { LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

const roles = [
  ['instascore_league_administrator', 'League administrator'],
  ['instascore_competition_manager', 'Competition manager'],
  ['instascore_team_administrator', 'Team administrator'],
  ['instascore_scorekeeper', 'Scorekeeper'],
  ['instascore_match_official', 'Match official'],
  ['editor', 'News editor'],
] as const;
const officialTypes = [
  ['referee', 'Referee'],
  ['umpire', 'Umpire'],
  ['table_official', 'Table official'],
  ['commissioner', 'Match commissioner'],
] as const;
const schema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  role: z.enum(roles.map(([value]) => value) as [string, ...string[]]),
  officialType: z.string(),
});
type AccountForm = z.infer<typeof schema>;

export function AdminAccountsPage() {
  const api = useApi();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const accounts = useQuery({ queryKey: ['admin', 'accounts'], queryFn: api.getAccounts });
  const form = useForm<AccountForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'instascore_scorekeeper',
      officialType: 'referee',
    },
  });
  const role = form.watch('role');
  const mutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      form.reset();
      setOpen(false);
      void client.invalidateQueries({ queryKey: ['admin', 'accounts'] });
    },
  });

  return (
    <PageScaffold
      eyebrow="People and access"
      title="Operational accounts"
      description="Invite the people who run competitions, teams, scoring, officiating and daily news. Each account receives only the permissions attached to its role."
      status="Audited access"
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
          <div>
            <Typography variant="h6">Current operational team</Typography>
            <Typography color="text.secondary">{accounts.data?.length ?? 0} accounts</Typography>
          </div>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create account
          </Button>
        </Stack>
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogContent sx={{ pt: '12px !important' }}>
            <Stack
              component="form"
              spacing={2}
              onSubmit={(event) =>
                void form.handleSubmit((values) => mutation.mutate(values))(event)
              }
            >
              <TextField
                label="First name"
                {...form.register('firstName')}
                error={!!form.formState.errors.firstName}
                helperText={form.formState.errors.firstName?.message}
              />
              <TextField
                label="Last name"
                {...form.register('lastName')}
                error={!!form.formState.errors.lastName}
                helperText={form.formState.errors.lastName?.message}
              />
              <TextField
                label="Email address"
                type="email"
                {...form.register('email')}
                error={!!form.formState.errors.email}
                helperText={form.formState.errors.email?.message}
              />
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} select label="Account role">
                    {roles.map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {role === 'instascore_match_official' && (
                <Controller
                  name="officialType"
                  control={form.control}
                  render={({ field }) => (
                    <TextField {...field} select label="Official type">
                      {officialTypes.map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              )}
              {mutation.isError && (
                <Alert severity="error">
                  {mutation.error instanceof ApiError
                    ? mutation.error.message
                    : 'The account could not be created.'}
                </Alert>
              )}
              {mutation.isSuccess && (
                <Alert severity="success">
                  Account created. A secure password setup email was sent.
                </Alert>
              )}
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating account…' : 'Create account and send invite'}
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
        <Stack spacing={1.25}>
          {accounts.isLoading && <LoadingState label="Loading accounts" />}
          {(accounts.data ?? []).map((account) => (
            <Paper key={account.uuid} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Stack>
                  <Typography fontWeight={850}>{account.displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {account.email}
                  </Typography>
                </Stack>
                <Chip
                  label={roles.find(([value]) => value === account.role)?.[1] ?? account.role}
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              {account.officialType && (
                <Typography variant="caption" color="text.secondary">
                  Official type: {account.officialType.replace('_', ' ')}
                </Typography>
              )}
            </Paper>
          ))}
          {accounts.data?.length === 0 && (
            <Alert severity="info">No operational accounts have been created yet.</Alert>
          )}
        </Stack>
      </Stack>
    </PageScaffold>
  );
}
