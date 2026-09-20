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

type ScoreAction = { label: string; eventType: ScoreEventType };

const sportActions: Record<string, ScoreAction[]> = {
  soccer: [
    { label: 'Goal', eventType: 'goal' },
    { label: 'Yellow card', eventType: 'yellow_card' },
    { label: 'Red card', eventType: 'red_card' },
  ],
  football: [
    { label: 'Goal', eventType: 'goal' },
    { label: 'Yellow card', eventType: 'yellow_card' },
    { label: 'Red card', eventType: 'red_card' },
  ],
  basketball: [
    { label: '+1 free throw', eventType: 'free_throw' },
    { label: '+2 field goal', eventType: 'two_point_field_goal' },
    { label: '+3 field goal', eventType: 'three_point_field_goal' },
    { label: 'Foul', eventType: 'foul' },
  ],
  nfl: [
    { label: 'Touchdown', eventType: 'touchdown' },
    { label: 'Field goal', eventType: 'field_goal' },
    { label: 'Extra point', eventType: 'extra_point' },
    { label: '2-point conversion', eventType: 'two_point_conversion' },
    { label: 'Safety', eventType: 'safety' },
  ],
  'american-football': [
    { label: 'Touchdown', eventType: 'touchdown' },
    { label: 'Field goal', eventType: 'field_goal' },
    { label: 'Extra point', eventType: 'extra_point' },
    { label: 'Safety', eventType: 'safety' },
  ],
  'flag-football': [
    { label: 'Touchdown', eventType: 'touchdown' },
    { label: '+1 conversion', eventType: 'one_point_conversion' },
    { label: '+2 conversion', eventType: 'two_point_conversion' },
    { label: 'Safety', eventType: 'safety' },
    { label: 'Interception', eventType: 'interception' },
    { label: 'Penalty', eventType: 'penalty' },
  ],
};

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
  const releaseMutation = useMutation({ mutationFn: () => api.releaseFixture(uuid) });
  const confirmMutation = useMutation({
    mutationFn: () => api.confirmResult(uuid),
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

  const sportSlug = query.data?.fixture.sport?.slug ?? 'flag-football';
  const actions = sportActions[sportSlug] ?? sportActions['flag-football'] ?? [];
  const sportName = query.data?.fixture.sport?.name ?? 'Flag Football';

  return (
    <PageScaffold
      eyebrow="Scorekeeper"
      title={`Live ${sportName} Controls`}
      description="Sport-aware match controls with offline event entry, audit history and revision conflict detection."
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
            <Button variant="outlined" color="warning" onClick={() => releaseMutation.mutate()}>
              Release
            </Button>
            {['start', 'pause', 'resume', 'period_end', 'period_start'].map((action) => (
              <Button key={action} variant="outlined" onClick={() => clockMutation.mutate(action)}>
                {action.replace('_', ' ')}
              </Button>
            ))}
            <Button color="success" variant="contained" onClick={() => completeMutation.mutate()}>
              Complete match
            </Button>
            {auth.state?.user?.capabilities.confirmResults &&
            query.data.fixture.status === 'completed' ? (
              <Button color="success" variant="outlined" onClick={() => confirmMutation.mutate()}>
                Confirm result
              </Button>
            ) : null}
          </Stack>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Event entry
              </Typography>
              <Grid container spacing={1}>
                {(['home', 'away'] as const).flatMap((teamSide) =>
                  actions.map((action) => (
                    <Grid key={`${action.eventType}-${teamSide}`} size={{ xs: 6, sm: 3 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        aria-label={
                          action.eventType === 'touchdown'
                            ? `${teamSide === 'home' ? 'Home' : 'Away'} TD`
                            : undefined
                        }
                        onClick={() => void addEvent(action.eventType, teamSide)}
                      >
                        {teamSide === 'home'
                          ? query.data.fixture.homeTeam.name
                          : query.data.fixture.awayTeam.name}{' '}
                        · {action.label}
                      </Button>
                    </Grid>
                  )),
                )}
              </Grid>
            </CardContent>
          </Card>
          <MatchTimeline events={query.data.events} onVoid={voidEvent} />
        </Stack>
      )}
    </PageScaffold>
  );
}
