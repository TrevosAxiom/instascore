import { Alert, Box, Button, Stack, Switch, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { readBootstrapSettings } from '../../app/bootstrap';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { promptForPush } from '../../onesignal/oneSignalAdapter';
import type { NotificationPreference, UserPreferences } from '../../types/api';

const labels: Record<string, string> = {
  match_starting: 'Match starting',
  score_change: 'Score changes',
  final_score: 'Final score',
  fixture_change: 'Fixture changes',
  team_news: 'Team news',
  competition_announcement: 'Competition announcements',
  fantasy_deadline: 'Fantasy deadline',
  fantasy_points_update: 'Fantasy points updates',
  fantasy_league_movement: 'Fantasy league movement',
  scorekeeper_assignment: 'Scorekeeper assignment',
  result_awaiting_confirmation: 'Result awaiting confirmation',
  provider_failure: 'Provider failure',
};

export function NotificationPreferencesPage() {
  const api = useApi();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const settings = useMemo(() => readBootstrapSettings().oneSignal, []);
  const [draft, setDraft] = useState<NotificationPreference[]>([]);
  const [profileDraft, setProfileDraft] = useState<UserPreferences | null>(null);
  const query = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: api.getNotificationPreferences,
    enabled: Boolean(state?.authenticated),
  });
  const profile = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: api.getUserPreferences,
    enabled: Boolean(state?.authenticated),
  });
  const save = useMutation({
    mutationFn: api.saveNotificationPreferences,
    onSuccess: (data) => {
      setDraft(data.preferences);
      queryClient.setQueryData(['notifications', 'preferences'], data);
    },
  });
  const saveProfile = useMutation({
    mutationFn: api.saveUserPreferences,
    onSuccess: (data) => {
      setProfileDraft(data);
      queryClient.setQueryData(['me', 'preferences'], data);
    },
  });
  const preferences = draft.length ? draft : (query.data?.preferences ?? []);
  const userPreferences = profileDraft ?? profile.data;

  if (!state?.authenticated) {
    return (
      <PageScaffold
        eyebrow="Push"
        title="Notification preferences"
        description="Sign in to manage match alerts, team follows and quiet hours."
      />
    );
  }

  return (
    <PageScaffold
      eyebrow="Push"
      title="Notification preferences"
      description="Choose what InstaScore can send, then opt in from a meaningful action."
      status="Preferences"
    >
      {query.isLoading ? <LoadingState label="Loading notification preferences" /> : null}
      {query.isError || profile.isError ? (
        <ErrorState description="Notification preferences could not be loaded." />
      ) : null}
      {query.data ? (
        <Stack spacing={3}>
          {query.data?.disabled ? (
            <Alert severity="warning">
              Push notifications are currently disabled by configuration.
            </Alert>
          ) : null}
          <Box className="instascore-panel">
            <Typography variant="h3">Permission</Typography>
            <Typography color="text.secondary">
              We do not ask for native permission on first load. Use this after following a team or
              enabling match alerts.
            </Typography>
            <Button variant="contained" onClick={() => void promptForPush(settings)} sx={{ mt: 2 }}>
              Enable push prompts
            </Button>
          </Box>
          {userPreferences ? (
            <Box className="instascore-panel">
              <Typography variant="h3">Profile delivery settings</Typography>
              <Typography color="text.secondary">
                These privacy-safe preferences help time alerts correctly without storing sensitive
                profile data.
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Timezone"
                  value={userPreferences.timezone}
                  onChange={(event) =>
                    setProfileDraft({ ...userPreferences, timezone: event.target.value })
                  }
                />
                <TextField
                  label="Language"
                  value={userPreferences.language}
                  onChange={(event) =>
                    setProfileDraft({ ...userPreferences, language: event.target.value })
                  }
                />
                <TextField
                  label="Preferred sports"
                  helperText="Separate multiple sports with commas."
                  value={userPreferences.preferredSports.join(', ')}
                  onChange={(event) =>
                    setProfileDraft({
                      ...userPreferences,
                      preferredSports: event.target.value
                        .split(',')
                        .map((sport) => sport.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <Button
                  variant="contained"
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate(userPreferences)}
                >
                  Save delivery settings
                </Button>
              </Stack>
            </Box>
          ) : null}
          <Box className="instascore-panel">
            <Typography variant="h3">Categories and quiet hours</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {preferences.map((preference, index) => (
                <Box
                  key={preference.category}
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: '1.3fr .6fr .6fr .8fr auto' },
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    py: 1,
                  }}
                >
                  <Typography fontWeight={800}>
                    {labels[preference.category] ?? preference.category}
                  </Typography>
                  <TextField
                    label="Quiet start"
                    value={preference.quiet_hours_start ?? preference.quietHoursStart ?? ''}
                    placeholder="22:00"
                    size="small"
                    onChange={(event) =>
                      updateDraft(index, { quiet_hours_start: event.target.value })
                    }
                  />
                  <TextField
                    label="Quiet end"
                    value={preference.quiet_hours_end ?? preference.quietHoursEnd ?? ''}
                    placeholder="07:00"
                    size="small"
                    onChange={(event) =>
                      updateDraft(index, { quiet_hours_end: event.target.value })
                    }
                  />
                  <TextField
                    label="Timezone"
                    value={preference.timezone}
                    size="small"
                    onChange={(event) => updateDraft(index, { timezone: event.target.value })}
                  />
                  <Switch
                    checked={Boolean(preference.enabled)}
                    onChange={(event) => updateDraft(index, { enabled: event.target.checked })}
                  />
                </Box>
              ))}
            </Stack>
            <Button
              variant="contained"
              disabled={save.isPending}
              onClick={() => save.mutate(preferences)}
              sx={{ mt: 3 }}
            >
              Save preferences
            </Button>
          </Box>
        </Stack>
      ) : null}
    </PageScaffold>
  );

  function updateDraft(index: number, patch: Partial<NotificationPreference>) {
    setDraft((current) => {
      const next = [...(current.length ? current : preferences)];
      const previous = next[index];
      if (!previous) {
        return next;
      }
      next[index] = { ...previous, ...patch };
      return next;
    });
  }
}
