import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';
import { statusLabel } from './fixtureFormat';

const tabLabels = ['Overview', 'Timeline', 'Lineups', 'Statistics', 'Table'];

function EmptyTab({ children }: { children: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
      <Typography color="text.secondary">{children}</Typography>
    </Paper>
  );
}

export function FootballMatchDetailPage() {
  const api = useApi();
  const { providerId = '' } = useParams();
  const [tab, setTab] = useState(0);
  const query = useQuery({
    queryKey: ['api-football-match', providerId],
    queryFn: () => api.getFootballMatch(providerId),
    enabled: Boolean(providerId),
    refetchInterval: (state) => (state.state.data?.match.status === 'live' ? 30_000 : false),
  });
  const details = query.data;
  const match = details?.match;
  const kickoff = match?.kickoffAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(
        new Date(match.kickoffAt),
      )
    : 'Kickoff time unavailable';
  const homeStats = details?.statistics[0];
  const awayStats = details?.statistics[1];
  const statLabels = Array.from(
    new Set(details?.statistics.flatMap((team) => team.items.map((item) => item.label)) ?? []),
  );

  return (
    <PageScaffold
      eyebrow={match?.competitionName ?? 'Soccer match'}
      title={match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Match centre'}
      description="Live score, timeline, lineups, match statistics and league table."
      {...(match ? { status: statusLabel(match.status) } : {})}
    >
      {query.isLoading ? <LoadingState label="Loading live match centre" /> : null}
      {query.isError ? (
        <ErrorState
          title="Match centre could not be loaded."
          description="This match may no longer be available in the provider feed."
        />
      ) : null}
      {match && details ? (
        <Stack spacing={2.5}>
          <Card
            sx={{
              borderRadius: 5,
              color: '#fff5d6',
              background: 'linear-gradient(135deg, rgb(7,25,45), rgb(12,48,83))',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                <Chip label={match.competitionName} color="primary" />
                <Chip
                  label={
                    match.elapsed
                      ? `${match.elapsed}' · ${statusLabel(match.status)}`
                      : statusLabel(match.status)
                  }
                  color={match.status === 'live' ? 'success' : 'default'}
                />
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
                  alignItems: 'center',
                  gap: { xs: 1, md: 4 },
                  mt: 3,
                }}
              >
                <Stack alignItems="center" spacing={1} textAlign="center">
                  <EntityAvatar
                    entity="team"
                    src={match.homeTeamLogoUrl}
                    alt={`${match.homeTeamName} logo`}
                    sx={{
                      width: { xs: 68, md: 108 },
                      height: { xs: 68, md: 108 },
                      bgcolor: '#fff',
                      p: 1,
                    }}
                  />
                  <Typography variant="h5" fontWeight={950}>
                    {match.homeTeamName}
                  </Typography>
                </Stack>
                <Stack alignItems="center">
                  <Typography variant="h2" fontWeight={950} whiteSpace="nowrap">
                    {match.homeScore} – {match.awayScore}
                  </Typography>
                  <Typography color="rgba(255,245,214,.7)">
                    {match.statusShort || statusLabel(match.status)}
                  </Typography>
                </Stack>
                <Stack alignItems="center" spacing={1} textAlign="center">
                  <EntityAvatar
                    entity="team"
                    src={match.awayTeamLogoUrl}
                    alt={`${match.awayTeamName} logo`}
                    sx={{
                      width: { xs: 68, md: 108 },
                      height: { xs: 68, md: 108 },
                      bgcolor: '#fff',
                      p: 1,
                    }}
                  />
                  <Typography variant="h5" fontWeight={950}>
                    {match.awayTeamName}
                  </Typography>
                </Stack>
              </Box>
              <Typography textAlign="center" color="rgba(255,245,214,.72)" sx={{ mt: 2 }}>
                {kickoff} · {match.venueName || 'Venue TBC'}
              </Typography>
            </CardContent>
          </Card>

          <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Tabs
              value={tab}
              onChange={(_, value: number) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Match detail sections"
            >
              {tabLabels.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Paper>

          {tab === 0 ? (
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr .8fr' }, gap: 2 }}
            >
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h4" fontWeight={950}>
                    Match information
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1.25}>
                    <Typography>
                      <strong>Kickoff:</strong> {kickoff}
                    </Typography>
                    <Typography>
                      <strong>Competition:</strong> {match.competitionName}
                    </Typography>
                    <Typography>
                      <strong>Round:</strong> {match.round || 'Not provided'}
                    </Typography>
                    <Typography>
                      <strong>Venue:</strong> {match.venueName || 'Venue TBC'}
                    </Typography>
                    <Typography>
                      <strong>Last refreshed:</strong>{' '}
                      {new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(
                        new Date(details.updatedAt),
                      )}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h4" fontWeight={950}>
                    Latest action
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {details.events
                    .slice(-4)
                    .reverse()
                    .map((event, index) => (
                      <Stack
                        key={`${event.elapsed}-${event.type}-${index}`}
                        direction="row"
                        spacing={1.5}
                        sx={{ py: 1 }}
                      >
                        <Chip
                          size="small"
                          label={`${event.elapsed}${event.extra ? `+${event.extra}` : ''}'`}
                        />
                        <Box>
                          <Typography fontWeight={850}>
                            {event.type}: {event.playerName || event.teamName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.detail}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  {!details.events.length ? (
                    <Typography color="text.secondary">No match events published yet.</Typography>
                  ) : null}
                </CardContent>
              </Card>
            </Box>
          ) : null}

          {tab === 1 ? (
            details.events.length ? (
              <Stack spacing={1.25}>
                {details.events.map((event, index) => (
                  <Paper
                    key={`${event.elapsed}-${event.type}-${index}`}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 3 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Chip
                        color={event.type === 'Goal' ? 'success' : 'default'}
                        label={`${event.elapsed}${event.extra ? `+${event.extra}` : ''}'`}
                      />
                      <Box>
                        <Typography fontWeight={950}>
                          {event.type} · {event.playerName || event.teamName}
                        </Typography>
                        <Typography color="text.secondary">
                          {event.detail}
                          {event.assistName ? ` · Assist: ${event.assistName}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <EmptyTab>Timeline data is not available for this competition yet.</EmptyTab>
            )
          ) : null}

          {tab === 2 ? (
            details.lineups.length ? (
              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
              >
                {details.lineups.map((lineup) => (
                  <Card key={lineup.teamId} variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <EntityAvatar
                          entity="team"
                          src={lineup.teamLogoUrl}
                          alt={`${lineup.teamName} logo`}
                        />
                        <Box>
                          <Typography variant="h5" fontWeight={950}>
                            {lineup.teamName}
                          </Typography>
                          <Typography color="text.secondary">
                            {lineup.formation || 'Formation TBC'} · Coach{' '}
                            {lineup.coachName || 'TBC'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="h6" fontWeight={950} sx={{ mt: 2 }}>
                        Starting XI
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          {lineup.startXI.map((player) => (
                            <TableRow key={player.id || `${player.number}-${player.name}`}>
                              <TableCell>{player.number || '–'}</TableCell>
                              <TableCell>{player.name}</TableCell>
                              <TableCell align="right">{player.position}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Typography variant="h6" fontWeight={950} sx={{ mt: 2 }}>
                        Substitutes
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          {lineup.substitutes.map((player) => (
                            <TableRow key={player.id || `${player.number}-${player.name}`}>
                              <TableCell>{player.number || '–'}</TableCell>
                              <TableCell>{player.name}</TableCell>
                              <TableCell align="right">{player.position}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <EmptyTab>Lineups have not been published for this match.</EmptyTab>
            )
          ) : null}

          {tab === 3 ? (
            statLabels.length ? (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{homeStats?.teamName || match.homeTeamName}</TableCell>
                      <TableCell align="center">Match statistics</TableCell>
                      <TableCell align="right">
                        {awayStats?.teamName || match.awayTeamName}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statLabels.map((label) => (
                      <TableRow key={label}>
                        <TableCell>
                          {String(
                            homeStats?.items.find((item) => item.label === label)?.value ?? '–',
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 850 }}>
                          {label}
                        </TableCell>
                        <TableCell align="right">
                          {String(
                            awayStats?.items.find((item) => item.label === label)?.value ?? '–',
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyTab>Match statistics are not available yet.</EmptyTab>
            )
          ) : null}

          {tab === 4 ? (
            details.standings.length ? (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Pos</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell align="center">P</TableCell>
                      <TableCell align="center">W</TableCell>
                      <TableCell align="center">D</TableCell>
                      <TableCell align="center">L</TableCell>
                      <TableCell align="center">GD</TableCell>
                      <TableCell align="right">Pts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.standings.map((row) => (
                      <TableRow
                        key={row.teamProviderId}
                        selected={[match.homeTeamName, match.awayTeamName].includes(row.teamName)}
                      >
                        <TableCell>{row.position}</TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <EntityAvatar
                              entity="team"
                              src={row.teamLogoUrl}
                              alt={`${row.teamName} logo`}
                              sx={{ width: 28, height: 28 }}
                            />
                            <Typography fontWeight={750}>{row.teamName}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">{row.played}</TableCell>
                        <TableCell align="center">{row.wins}</TableCell>
                        <TableCell align="center">{row.draws}</TableCell>
                        <TableCell align="center">{row.losses}</TableCell>
                        <TableCell align="center">{row.pointDifference}</TableCell>
                        <TableCell align="right">
                          <strong>{row.points}</strong>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyTab>League table is unavailable for this competition.</EmptyTab>
            )
          ) : null}

          <Button
            component={RouterLink}
            to="/scores?sport=football"
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          >
            Back to soccer scores
          </Button>
        </Stack>
      ) : null}
    </PageScaffold>
  );
}
