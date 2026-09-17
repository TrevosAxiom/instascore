import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useApi } from '../../api/context';
import { usePwa } from '../../pwa/PwaProvider';
import type { Fixture, FixtureStream, LiveMatchState } from '../../types/api';
import { BroadcastScoreOverlay } from './BroadcastScoreOverlay';
import { MatchBanter } from './MatchBanter';

export function YouTubeBroadcastPlayer({
  stream,
  fixture,
  liveState,
}: {
  stream: FixtureStream;
  fixture?: Fixture | undefined;
  liveState?: LiveMatchState | undefined;
}) {
  const pwa = usePwa();
  const api = useApi();
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [miniPlayer, setMiniPlayer] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [now, setNow] = useState(() => Date.now());
  const [analyticsSession] = useState(createAnalyticsSession);
  const isLive = stream.status === 'live';
  const isReplay =
    stream.replayAvailable || stream.status === 'replay_available' || stream.status === 'ended';
  const scheduledAt = useMemo(() => parseUtc(stream.scheduledStart), [stream.scheduledStart]);
  const countdown = scheduledAt && scheduledAt > now ? formatCountdown(scheduledAt - now) : null;
  const poster = stream.thumbnailUrl || `https://i.ytimg.com/vi/${stream.videoId}/hqdefault.jpg`;
  const sponsors = useQuery({
    queryKey: ['fixture', fixture?.uuid, 'stream-sponsors'],
    queryFn: () => api.getStreamSponsors(fixture?.uuid ?? ''),
    enabled: Boolean(fixture),
    staleTime: 5 * 60_000,
  });
  const preMatchSponsor = sponsors.data?.find((item) => item.placement === 'pre_match');
  const inPlayerSponsor = sponsors.data?.find((item) => item.placement === 'in_player');
  const postMatchSponsor = sponsors.data?.find((item) => item.placement === 'post_match');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
    };
  }, []);

  useEffect(() => {
    if (!fixture) return;
    const displayed = [
      preMatchSponsor,
      playerLoaded ? inPlayerSponsor : null,
      isReplay ? postMatchSponsor : null,
    ].filter((sponsor): sponsor is NonNullable<typeof sponsor> => Boolean(sponsor));
    displayed.forEach((sponsor) => {
      void api.recordSponsorEvent(sponsor.uuid, 'impression', analyticsSession);
    });
  }, [
    analyticsSession,
    api,
    fixture,
    inPlayerSponsor,
    isReplay,
    playerLoaded,
    postMatchSponsor,
    preMatchSponsor,
  ]);

  useEffect(() => {
    if (!fixture || !playerLoaded) return;
    const startedAt = Date.now();
    const send = (action: 'start' | 'heartbeat' | 'complete') =>
      api.recordStreamEngagement(fixture.uuid, {
        sessionId: analyticsSession,
        action,
        device: deviceCategory(),
        watchSeconds: Math.floor((Date.now() - startedAt) / 1000),
      });
    void send('start');
    const heartbeat = window.setInterval(() => void send('heartbeat'), 30_000);
    return () => {
      window.clearInterval(heartbeat);
      void send('complete');
    };
  }, [analyticsSession, api, fixture, playerLoaded]);

  const share = async () => {
    const data = { title: stream.title || 'InstaScore match broadcast', url: window.location.href };
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <Paper
      variant="outlined"
      aria-label={miniPlayer ? 'Compact livestream player' : 'Livestream player'}
      sx={{
        borderRadius: miniPlayer ? 2 : 3,
        overflow: 'hidden',
        ...(miniPlayer
          ? {
              position: 'fixed',
              zIndex: 1400,
              width: { xs: 'calc(100% - 16px)', sm: 480 },
              right: { xs: 8, sm: 20 },
              bottom: { xs: 72, sm: 20 },
              boxShadow: '0 20px 60px rgba(0,0,0,.42)',
            }
          : {}),
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={1}
        sx={{ px: 2, py: 1.25 }}
      >
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Chip
            size="small"
            color={isLive ? 'error' : isReplay ? 'primary' : 'default'}
            label={
              isLive
                ? 'LIVE'
                : isReplay
                  ? 'REPLAY'
                  : stream.status.replaceAll('_', ' ').toUpperCase()
            }
          />
          <Typography fontWeight={900}>{stream.title || 'Match broadcast'}</Typography>
          {countdown ? (
            <Chip size="small" variant="outlined" label={`Starts in ${countdown}`} />
          ) : null}
        </Stack>
        <Stack direction="row" gap={0.5} flexWrap="wrap">
          {liveState ? (
            <Button size="small" onClick={() => setOverlayVisible((value) => !value)}>
              {overlayVisible ? 'Hide score' : 'Show score'}
            </Button>
          ) : null}
          {playerLoaded ? (
            <Button
              size="small"
              onClick={() => {
                setMiniPlayer((value) => !value);
                setChatVisible(false);
              }}
            >
              {miniPlayer ? 'Return to page' : 'Mini player'}
            </Button>
          ) : null}
          {pwa.standalone && pwa.nativeCapabilities.wakeLock ? (
            <Button size="small" onClick={() => void pwa.setWakeLock(!pwa.wakeLockActive)}>
              {pwa.wakeLockActive ? 'Screen awake' : 'Keep awake'}
            </Button>
          ) : null}
          <Button size="small" onClick={() => void share()}>
            Share
          </Button>
          <Button
            component="a"
            href={stream.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
          >
            YouTube
          </Button>
        </Stack>
      </Stack>
      {!online ? (
        <Alert severity="warning">
          You are offline. Live scores can recover automatically, but video needs an internet
          connection.
        </Alert>
      ) : null}
      {stream.status === 'interrupted' ? (
        <Alert severity="warning">
          The video feed has been interrupted. Live scores and match events will continue updating.
        </Alert>
      ) : null}
      {stream.status === 'testing' ? (
        <Alert severity="info">
          The broadcast team is testing the Veo feed. Video may appear briefly before kickoff.
        </Alert>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          bgcolor: 'rgb(7,25,45)',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            bgcolor: 'rgb(7,25,45)',
          }}
        >
          {playerLoaded && online ? (
            <Box
              component="iframe"
              title={stream.title || 'InstaScore match broadcast'}
              src={`${stream.embedUrl}?playsinline=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                color: '#fff',
                backgroundImage: `linear-gradient(rgba(7,25,45,.48),rgba(7,25,45,.82)),url("${poster}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                p: 3,
              }}
            >
              <Stack spacing={1.5} alignItems="center">
                <Typography variant="h4" fontWeight={950}>
                  {countdown
                    ? `Broadcast starts in ${countdown}`
                    : isReplay
                      ? 'Watch the match replay'
                      : isLive
                        ? 'The match is live'
                        : 'Broadcast ready'}
                </Typography>
                <Typography sx={{ maxWidth: 560, color: 'rgba(255,255,255,.82)' }}>
                  Video loads only when you choose to watch, helping protect mobile data and keeping
                  the match centre fast.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  disabled={!online}
                  onClick={() => setPlayerLoaded(true)}
                >
                  ▶ {isReplay ? 'Play replay' : 'Watch broadcast'}
                </Button>
                {preMatchSponsor ? (
                  <SponsorBadge
                    sponsor={preMatchSponsor}
                    onClick={() =>
                      void api.recordSponsorEvent(preMatchSponsor.uuid, 'click', analyticsSession)
                    }
                  />
                ) : null}
              </Stack>
            </Box>
          )}
          {playerLoaded && inPlayerSponsor ? (
            <Box sx={{ position: 'absolute', zIndex: 4, top: 10, right: 10 }}>
              <SponsorBadge
                sponsor={inPlayerSponsor}
                compact
                onClick={() =>
                  void api.recordSponsorEvent(inPlayerSponsor.uuid, 'click', analyticsSession)
                }
              />
            </Box>
          ) : null}
          {fixture && liveState && overlayVisible ? (
            <BroadcastScoreOverlay fixture={fixture} state={liveState} compact={miniPlayer} />
          ) : null}
        </Box>
      </Box>
      {fixture && !miniPlayer ? (
        <Button fullWidth onClick={() => setChatVisible(true)} sx={{ borderRadius: 0 }}>
          Open match banter
        </Button>
      ) : null}
      {postMatchSponsor && isReplay && !miniPlayer ? (
        <Stack alignItems="center" sx={{ p: 1.25 }}>
          <SponsorBadge
            sponsor={postMatchSponsor}
            onClick={() =>
              void api.recordSponsorEvent(postMatchSponsor.uuid, 'click', analyticsSession)
            }
          />
        </Stack>
      ) : null}
      {fixture ? (
        <MatchBanter
          fixtureUuid={fixture.uuid}
          open={chatVisible}
          onClose={() => setChatVisible(false)}
        />
      ) : null}
    </Paper>
  );
}

function SponsorBadge({
  sponsor,
  compact = false,
  onClick,
}: {
  sponsor: import('../../types/api').StreamSponsor;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component={sponsor.destinationUrl ? 'a' : 'div'}
      {...(sponsor.destinationUrl
        ? { href: sponsor.destinationUrl, target: '_blank', rel: 'sponsored noopener noreferrer' }
        : {})}
      onClick={onClick}
      aria-label={`Sponsor: ${sponsor.sponsorName}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: 'rgba(255,255,255,.94)',
        color: 'rgb(7,25,45)',
        borderRadius: 1.5,
        px: compact ? 0.75 : 1.25,
        py: compact ? 0.5 : 0.75,
        textDecoration: 'none',
        boxShadow: 2,
      }}
    >
      {sponsor.logoUrl ? (
        <Box
          component="img"
          src={sponsor.logoUrl}
          alt=""
          sx={{ width: compact ? 22 : 34, height: compact ? 22 : 34, objectFit: 'contain' }}
        />
      ) : null}
      <Box>
        <Typography
          sx={{
            fontSize: compact ? '.52rem' : '.62rem',
            lineHeight: 1,
            opacity: 0.65,
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          Presented by
        </Typography>
        <Typography
          sx={{ fontSize: compact ? '.68rem' : '.82rem', lineHeight: 1.2, fontWeight: 950 }}
        >
          {sponsor.sponsorName}
        </Typography>
      </Box>
    </Box>
  );
}

function createAnalyticsSession() {
  try {
    const existing = window.sessionStorage.getItem('instascore_stream_session');
    if (existing) return existing;
    const value = crypto.randomUUID();
    window.sessionStorage.setItem('instascore_stream_session', value);
    return value;
  } catch {
    return crypto.randomUUID();
  }
}

function deviceCategory() {
  const width = window.innerWidth;
  if (width < 600) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function parseUtc(value: string | null) {
  if (!value) return null;
  const normalized =
    value.includes('T') || value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`;
  const timestamp = new Date(normalized).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatCountdown(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}
