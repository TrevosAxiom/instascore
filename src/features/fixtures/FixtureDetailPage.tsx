import { Box, Card, CardContent, Chip, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';
import { useLiveMatchStream } from '../../realtime/useLiveMatchStream';
import { LiveScoreboard } from '../scoring/LiveScoreboard';
import { MatchTimeline } from '../scoring/MatchTimeline';
import { fixtureTitle, formatKickoff, statusLabel } from './fixtureFormat';

const flagTabs = ['Overview', 'Scoring plays', 'Team stats', 'Match info'];
const generalTabs = ['Overview', 'Timeline', 'Team stats', 'Match info'];

export function FixtureDetailPage() {
  const api = useApi();
  const { uuid = '' } = useParams();
  const [tab, setTab] = useState(0);
  const query = useQuery({
    queryKey: ['fixture', uuid],
    queryFn: () => api.getFixture(uuid),
    enabled: Boolean(uuid),
  });
  const stream = useLiveMatchStream(api, uuid);
  const live = useQuery({
    queryKey: ['live-match', uuid],
    queryFn: () => api.getLiveMatch(uuid),
    enabled: Boolean(uuid),
    refetchInterval: () =>
      stream.transport === 'sse' ? false : document.visibilityState === 'visible' ? 5000 : false,
    refetchIntervalInBackground: false,
  });
  const fixture = query.data;
  const liveState = stream.state ?? live.data;
  const isFlag = fixture?.sport.slug.includes('flag') ?? false;
  const tabs = isFlag ? flagTabs : generalTabs;
  const teamStats = useMemo(() => {
    const base = {
      home: {
        points: 0,
        touchdowns: 0,
        conversions: 0,
        safeties: 0,
        interceptions: 0,
        penalties: 0,
      },
      away: {
        points: 0,
        touchdowns: 0,
        conversions: 0,
        safeties: 0,
        interceptions: 0,
        penalties: 0,
      },
    };
    liveState?.events
      .filter((event) => !event.voided && event.teamSide)
      .forEach((event) => {
        if (!event.teamSide) return;
        const stats = base[event.teamSide];
        stats.points += event.points;
        if (event.eventType === 'touchdown') stats.touchdowns += 1;
        if (event.eventType.includes('conversion')) stats.conversions += 1;
        if (event.eventType === 'safety') stats.safeties += 1;
        if (event.eventType === 'interception') stats.interceptions += 1;
        if (event.eventType === 'penalty') stats.penalties += 1;
      });
    return base;
  }, [liveState]);

  return (
    <PageScaffold
      eyebrow={isFlag ? 'Flag football match centre' : 'Match centre'}
      title={fixture ? fixtureTitle(fixture) : 'Fixture'}
      description={
        isFlag
          ? 'Live downs, scoring plays, conversions and team match statistics.'
          : 'Score, match status, venue and key moments in one place.'
      }
      {...(fixture ? { status: statusLabel(fixture.status) } : {})}
    >
      {query.isLoading ? <LoadingState label="Loading fixture" /> : null}
      {query.isError ? <ErrorState title="Fixture could not be loaded." /> : null}
      {fixture ? (
        <Stack spacing={2}>
          <Card
            sx={{
              borderRadius: 4,
              color: '#fff5d6',
              background: 'linear-gradient(135deg,rgb(7,25,45),rgb(14,48,79))',
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
                <Chip label={fixture.competition.name} color="primary" />
                <Chip
                  label={statusLabel(fixture.status)}
                  color={fixture.status === 'live' ? 'success' : 'default'}
                />
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 1,
                  mt: 2,
                }}
              >
                {([fixture.homeTeam, fixture.awayTeam] as const).map((team, index) => (
                  <Stack
                    key={team.uuid}
                    alignItems="center"
                    textAlign="center"
                    spacing={0.75}
                    sx={{ gridColumn: index ? 3 : 1, gridRow: 1 }}
                  >
                    <EntityAvatar
                      entity="team"
                      alt={`${team.name} logo`}
                      sx={{
                        width: { xs: 58, sm: 78 },
                        height: { xs: 58, sm: 78 },
                        bgcolor: '#fff',
                      }}
                    />
                    <Typography fontWeight={950}>{team.name}</Typography>
                  </Stack>
                ))}
                <Stack alignItems="center" sx={{ gridColumn: 2, gridRow: 1 }}>
                  <Typography variant="h2" fontWeight={950}>
                    {liveState ? `${liveState.score.home}–${liveState.score.away}` : 'VS'}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,245,214,.72)">
                    {liveState?.clock.periodLabel || formatKickoff(fixture)}
                  </Typography>
                </Stack>
              </Box>
            </CardContent>
          </Card>
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Tabs
              value={tab}
              onChange={(_, value: number) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Match detail sections"
            >
              {tabs.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Paper>
          {liveState ? (
            <Chip
              label={
                stream.transport === 'sse' ? 'Live updates connected' : 'Updating automatically'
              }
              color={stream.transport === 'sse' ? 'success' : 'default'}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            />
          ) : null}
          {tab === 0 ? (
            <Stack spacing={2}>
              {liveState ? (
                <LiveScoreboard state={liveState} />
              ) : (
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography color="text.secondary">
                    The live scoreboard will activate when match scoring begins.
                  </Typography>
                </Paper>
              )}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5" fontWeight={950}>
                    Match overview
                  </Typography>
                  <Typography sx={{ mt: 1 }}>
                    {fixture.roundName || 'Round TBC'}
                    {fixture.bracketSlot ? ` · ${fixture.bracketSlot}` : ''}
                  </Typography>
                  <Typography color="text.secondary">
                    {formatKickoff(fixture)} · {fixture.venue?.name ?? 'Venue TBC'}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          ) : null}
          {tab === 1 ? (
            <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
              <Typography variant="h5" fontWeight={950} sx={{ mb: 1 }}>
                {isFlag ? 'Scoring and key plays' : 'Match timeline'}
              </Typography>
              <MatchTimeline events={liveState?.events ?? []} />
            </Paper>
          ) : null}
          {tab === 2 ? (
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}
            >
              {(
                [
                  ['home', fixture.homeTeam.name],
                  ['away', fixture.awayTeam.name],
                ] as const
              ).map(([side, name]) => (
                <Card key={side} variant="outlined">
                  <CardContent>
                    <Typography variant="h5" fontWeight={950}>
                      {name}
                    </Typography>
                    {Object.entries(teamStats[side]).map(([label, value]) => (
                      <Stack
                        key={label}
                        direction="row"
                        justifyContent="space-between"
                        sx={{ py: 0.75, borderBottom: 1, borderColor: 'divider' }}
                      >
                        <Typography sx={{ textTransform: 'capitalize' }}>{label}</Typography>
                        <Typography fontWeight={950}>{value}</Typography>
                      </Stack>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : null}
          {tab === 3 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>
                  Match information
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Typography>
                    <strong>Competition:</strong> {fixture.competition.name}
                  </Typography>
                  <Typography>
                    <strong>Season:</strong> {fixture.season.name}
                  </Typography>
                  <Typography>
                    <strong>Kickoff:</strong> {formatKickoff(fixture)}
                  </Typography>
                  <Typography>
                    <strong>Venue:</strong> {fixture.venue?.name ?? 'Venue TBC'}
                  </Typography>
                  <Typography>
                    <strong>Status:</strong> {statusLabel(fixture.status)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      ) : null}
    </PageScaffold>
  );
}
