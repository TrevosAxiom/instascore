import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import type { YouTubeFixtureSuggestion } from '../../types/api';

function statusColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'live') return 'error';
  if (status === 'failed' || status === 'interrupted') return 'warning';
  if (status === 'scheduled' || status === 'replay_available') return 'success';
  return 'default';
}

export function LiveControlRoom() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const room = useQuery({
    queryKey: ['youtube-control-room'],
    queryFn: api.getYouTubeControlRoom,
    enabled: open,
    refetchInterval: open ? 30_000 : false,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['youtube-control-room'] });
    void queryClient.invalidateQueries({ queryKey: ['youtube-stream-health'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-fixtures'] });
  };
  const sync = useMutation({ mutationFn: api.syncYouTubeBroadcasts, onSuccess: refresh });
  const autoMatch = useMutation({ mutationFn: api.autoMatchYouTubeBroadcasts, onSuccess: refresh });
  const attach = useMutation({
    mutationFn: ({ fixtureUuid, videoId }: { fixtureUuid: string; videoId: string }) =>
      api.attachYouTubeBroadcast({ fixtureUuid, videoId }),
    onSuccess: refresh,
  });

  return (
    <>
      <Button variant="contained" color="secondary" onClick={() => setOpen(true)}>
        Open live control room
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="span" fontWeight={950}>
                Live Control Room
              </Typography>
              <Typography variant="body2" color="text.secondary">
                YouTube and Veo match-day operations
              </Typography>
            </Box>
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              Sync channel
            </Button>
            <Button variant="outlined" onClick={() => autoMatch.mutate()} disabled={autoMatch.isPending}>
              Auto-match safe suggestions
            </Button>
          </Stack>
        </DialogTitle>
        {(room.isFetching || sync.isPending || autoMatch.isPending || attach.isPending) && (
          <LinearProgress />
        )}
        <DialogContent dividers>
          {room.isLoading ? <LoadingState label="Opening the control room" /> : null}
          {room.isError ? (
            <ErrorState
              title="Control room could not connect"
              description="Check the YouTube connection in Settings, then try again."
              onRetry={() => void room.refetch()}
            />
          ) : null}
          {room.data ? (
            <Stack spacing={2.5}>
              <Grid container spacing={1.25}>
                {[
                  ['Attached', room.data.health.total],
                  ['Live now', room.data.health.live],
                  ['Needs attention', room.data.health.failed + room.data.health.stale],
                  ['Review queue', room.data.reviewQueue.length],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 6, md: 3 }}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="h5" fontWeight={950}>{value}</Typography>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {room.data.health.failed || room.data.health.stale ? (
                <Alert severity="warning">
                  One or more attached streams are stale, interrupted, or reporting synchronization errors. Verify the Veo uplink and YouTube Live Control Room before kickoff.
                </Alert>
              ) : (
                <Alert severity="success">All attached streams are reporting normally.</Alert>
              )}

              <Box>
                <Typography variant="h6" fontWeight={950} gutterBottom>Attached streams</Typography>
                <Grid container spacing={1.25}>
                  {room.data.health.items.map((item) => (
                    <Grid key={`${item.fixtureUuid}-${item.videoId}`} size={{ xs: 12, md: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                        <Stack direction="row" gap={1} alignItems="flex-start">
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography fontWeight={900} noWrap>{item.fixtureName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Last sync: {item.lastSyncedAt ?? 'Never'}
                            </Typography>
                          </Box>
                          <Chip size="small" color={statusColor(item.status)} label={item.status.replaceAll('_', ' ')} />
                        </Stack>
                        {item.stale ? <Alert severity="warning" sx={{ mt: 1 }}>Updates are more than five minutes old.</Alert> : null}
                        {item.errorMessage ? <Alert severity="error" sx={{ mt: 1 }}>{item.errorMessage}</Alert> : null}
                        <Stack direction="row" gap={1} sx={{ mt: 1 }}>
                          <Button size="small" component={RouterLink} to={`/fixtures/${item.fixtureUuid}`}>Open match</Button>
                          <Button size="small" href={`https://studio.youtube.com/video/${item.videoId}/livestreaming`} target="_blank" rel="noreferrer">YouTube Studio</Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                  {!room.data.health.items.length ? (
                    <Grid size={12}><Alert severity="info">No fixtures have a broadcast attached yet.</Alert></Grid>
                  ) : null}
                </Grid>
              </Box>

              <Divider />
              <Box>
                <Typography variant="h6" fontWeight={950}>Fixture matching review</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  High-confidence matches require both team names and a close scheduled kickoff. Medium and low matches always require your approval.
                </Typography>
                <Stack spacing={1.25}>
                  {room.data.reviewQueue.map(({ broadcast, suggestions }) => (
                    <Paper key={broadcast.videoId} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
                        {broadcast.thumbnailUrl ? (
                          <Box component="img" src={broadcast.thumbnailUrl} alt="" sx={{ width: { xs: '100%', md: 160 }, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 1 }} />
                        ) : null}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                            <Typography fontWeight={950}>{broadcast.title}</Typography>
                            <Chip size="small" color={statusColor(broadcast.status)} label={broadcast.status.replaceAll('_', ' ')} />
                            {broadcast.concurrentViewers !== null ? <Chip size="small" label={`${broadcast.concurrentViewers} watching`} /> : null}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {broadcast.scheduledStart ? new Date(broadcast.scheduledStart).toLocaleString() : 'No scheduled start'}
                          </Typography>
                          <Stack spacing={0.75} sx={{ mt: 1 }}>
                            {suggestions.map((suggestion: YouTubeFixtureSuggestion) => (
                              <Paper key={suggestion.fixtureUuid} variant="outlined" sx={{ p: 1 }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body2" fontWeight={900}>{suggestion.fixtureName}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {suggestion.competitionName} · {new Date(`${suggestion.kickoffAt.replace(' ', 'T')}Z`).toLocaleString()} · {suggestion.reasons.join(' · ')}
                                    </Typography>
                                  </Box>
                                  <Chip size="small" color={suggestion.confidence === 'high' ? 'success' : suggestion.confidence === 'medium' ? 'warning' : 'default'} label={`${suggestion.score}% ${suggestion.confidence}`} />
                                  <Button size="small" variant="contained" onClick={() => attach.mutate({ fixtureUuid: suggestion.fixtureUuid, videoId: broadcast.videoId })}>Attach</Button>
                                </Stack>
                              </Paper>
                            ))}
                            {!suggestions.length ? <Alert severity="info">No likely fixture found. Create or reschedule the fixture, then refresh.</Alert> : null}
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                  {!room.data.reviewQueue.length ? <Alert severity="success">Every active channel broadcast is attached or complete.</Alert> : null}
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
