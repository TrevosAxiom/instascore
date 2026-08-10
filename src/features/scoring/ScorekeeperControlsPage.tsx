import { Alert, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { usePwa } from '../../pwa/PwaProvider';
import {
  enqueueScoreEvent,
  summarizeQueue,
  syncQueuedScoreEvents,
  type QueueSummary,
} from '../../pwa/offlineQueue';
import type { MatchEvent, ScoreEventType } from '../../types/api';
import { LiveScoreboard } from './LiveScoreboard';
import { MatchTimeline } from './MatchTimeline';

const scoreButtons: { label: string; eventType: ScoreEventType; teamSide: 'home' | 'away' }[] = [
  { label: 'Home TD', eventType: 'touchdown', teamSide: 'home' },
  { label: 'Away TD', eventType: 'touchdown', teamSide: 'away' },
  { label: 'Home +1', eventType: 'one_point_conversion', teamSide: 'home' },
  { label: 'Away +1', eventType: 'one_point_conversion', teamSide: 'away' },
  { label: 'Home +2', eventType: 'two_point_conversion', teamSide: 'home' },
  { label: 'Away +2', eventType: 'two_point_conversion', teamSide: 'away' },
  { label: 'Home safety', eventType: 'safety', teamSide: 'home' },
  { label: 'Away safety', eventType: 'safety', teamSide: 'away' },
];

export function ScorekeeperControlsPage() {
  const { uuid = '' } = useParams();
  const api = useApi();
  const auth = useAuth();
  const pwa = usePwa();
  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState('');
  const [queueSummary, setQueueSummary] = useState<QueueSummary>({
    pending: 0,
    synced: 0,
    failed: 0,
    conflict: 0,
  });
  const query = useQuery({
    queryKey: ['live-match', uuid],
    queryFn: () => api.getLiveMatch(uuid),
    enabled: Boolean(uuid),
    refetchInterval: () => (document.visibilityState === 'visible' ? 5000 : false),
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (query.dataUpdatedAt > 0) {
      pwa.setLastUpdatedAt(new Date(query.dataUpdatedAt).toISOString());
    }
  }, [pwa, query.dataUpdatedAt]);
  const revision = query.data?.revision ?? 0;
  const period = query.data?.clock.period ?? 1;
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['live-match', uuid] });
  const clockMutation = useMutation({
    mutationFn: (action: string) => api.controlClock(uuid, action),
    onSuccess: invalidate,
  });
  const claimMutation = useMutation({
    mutationFn: () => api.claimFixture(uuid),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: () => api.completeFixture(uuid),
    onSuccess: invalidate,
  });
  const clientSeed = useMemo(() => crypto.randomUUID(), []);
  const refreshQueueSummary = () => {
    void summarizeQueue(uuid).then(setQueueSummary);
  };

  useEffect(() => {
    refreshQueueSummary();
  }, [uuid]);

  async function syncQueue() {
    const result = await syncQueuedScoreEvents(api, uuid);
    if (result.latestState) {
      queryClient.setQueryData(['live-match', uuid], result.latestState);
      pwa.setLastUpdatedAt();
    }
    if (result.conflicts > 0) {
      setConflict(
        'One or more queued events conflict with the server revision. Review before retrying.',
      );
    }
    refreshQueueSummary();
  }

  useEffect(() => {
    if (!pwa.online) {
      return;
    }
    void syncQueue();
  }, [pwa.online, uuid]);

  async function addEvent(eventType: ScoreEventType, teamSide: 'home' | 'away') {
    const payload = {
      clientEventId: `${clientSeed}-${Date.now()}-${eventType}-${teamSide}`,
      eventType,
      teamSide,
      period,
      clockSeconds: query.data?.clock.clockSeconds ?? 0,
      expectedRevision: revision,
    };

    await enqueueScoreEvent({
      clientEventId: payload.clientEventId,
      fixtureUuid: uuid,
      payload,
      deviceTimestamp: new Date().toISOString(),
      user: auth.state?.user
        ? { uuid: auth.state.user.uuid, displayName: auth.state.user.displayName }
        : null,
      baseRevision: revision,
    });
    refreshQueueSummary();

    if (!pwa.online) {
      setConflict('');
      return;
    }

    await syncQueue();
  }

  function voidEvent(event: MatchEvent) {
    void api.voidMatchEvent(uuid, event.uuid, 'Voided from scorekeeper controls.').then((state) => {
      queryClient.setQueryData(['live-match', uuid], state);
    });
  }

  return (
    <PageScaffold
      eyebrow="Scorekeeper"
      title="Live Flag-Football Controls"
      description="Mobile-first scoring controls with idempotent event entry and revision conflict detection."
      status="Match operations"
    >
      {query.isLoading && <LoadingState label="Loading match controls" />}
      {query.isError && !query.data && <ErrorState title="Live match could not be loaded." />}
      {conflict && <Alert severity="warning">{conflict}</Alert>}
      {query.data && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    color={pwa.online ? 'success' : 'warning'}
                    label={pwa.online ? 'Online' : 'Offline'}
                  />
                  <Chip label={`${queueSummary.pending} pending`} />
                  <Chip label={`${queueSummary.synced} synced`} />
                  {queueSummary.failed > 0 && (
                    <Chip color="error" label={`${queueSummary.failed} failed`} />
                  )}
                  {queueSummary.conflict > 0 && (
                    <Chip color="warning" label={`${queueSummary.conflict} conflicts`} />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Score events are saved on this device before submission. Server revisions remain
                  authoritative.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => void syncQueue()}
                  disabled={!pwa.online || queueSummary.pending + queueSummary.failed === 0}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Sync queued events
                </Button>
              </Stack>
            </CardContent>
          </Card>
          <LiveScoreboard state={query.data} />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => claimMutation.mutate()}>
              Claim
            </Button>
            {['start', 'pause', 'resume', 'period_end', 'period_start'].map((action) => (
              <Button key={action} variant="outlined" onClick={() => clockMutation.mutate(action)}>
                {action.replace('_', ' ')}
              </Button>
            ))}
            <Button color="success" variant="contained" onClick={() => completeMutation.mutate()}>
              Complete match
            </Button>
          </Stack>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Event entry
              </Typography>
              <Grid container spacing={1}>
                {scoreButtons.map((button) => (
                  <Grid key={`${button.eventType}-${button.teamSide}`} size={{ xs: 6, sm: 3 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => void addEvent(button.eventType, button.teamSide)}
                    >
                      {button.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
          <MatchTimeline events={query.data.events} onVoid={voidEvent} />
        </Stack>
      )}
    </PageScaffold>
  );
}
