import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';

export function NflMatchDetailPage() {
  const api = useApi();
  const { providerId = '' } = useParams();
  const [tab, setTab] = useState(0);
  const query = useQuery({
    queryKey: ['api-nfl-match', providerId],
    queryFn: () => api.getProviderMatch('nfl', providerId),
    enabled: Boolean(providerId),
    refetchInterval: (state) => (state.state.data?.match.status === 'live' ? 30_000 : false),
  });
  const details = query.data;
  const match = details?.match;
  const statLabels = Array.from(
    new Set(details?.statistics.flatMap((team) => team.items.map((item) => item.label)) ?? []),
  );
  const matchState = match && 'sportState' in match ? match.sportState : undefined;

  return (
    <PageScaffold
      eyebrow={match?.competitionName ?? 'American football'}
      title={match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'NFL match centre'}
      description="Score, game information, team statistics and competition table."
    >
      {query.isLoading ? <LoadingState label="Loading NFL match centre" /> : null}
      {query.isError ? (
        <ErrorState
          title="NFL match centre could not be loaded."
          description="The game may not have been synchronized yet."
        />
      ) : null}
      {match && details ? (
        <Stack spacing={2}>
          <Card
            sx={{
              borderRadius: 5,
              color: '#fff5d6',
              background: 'linear-gradient(135deg, rgb(7,25,45), rgb(12,48,83))',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {[
                  [match.homeTeamName, match.homeTeamLogoUrl],
                  [match.awayTeamName, match.awayTeamLogoUrl],
                ].map(([name, logo], index) => (
                  <Stack
                    key={name}
                    alignItems="center"
                    spacing={1}
                    sx={{ gridColumn: index === 0 ? 1 : 3 }}
                  >
                    <EntityAvatar
                      entity="team"
                      src={logo}
                      alt={`${name} logo`}
                      sx={{
                        width: { xs: 64, md: 100 },
                        height: { xs: 64, md: 100 },
                        bgcolor: '#fff',
                        p: 1,
                      }}
                    />
                    <Typography variant="h5" fontWeight={950} textAlign="center">
                      {name}
                    </Typography>
                  </Stack>
                ))}
                <Typography variant="h2" fontWeight={950} sx={{ gridColumn: 2, gridRow: 1 }}>
                  {match.homeScore} – {match.awayScore}
                </Typography>
              </Box>
              <Typography textAlign="center" sx={{ mt: 2, opacity: 0.75 }}>
                {match.kickoffAt ? new Date(match.kickoffAt).toLocaleString() : 'Time TBC'}
              </Typography>
              <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  label={match.status}
                  color={match.status === 'live' ? 'success' : 'default'}
                />
                {matchState?.periodLabel ? <Chip label={matchState.periodLabel} /> : null}
              </Stack>
            </CardContent>
          </Card>
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable">
              {['Overview', 'Scoring', 'Team stats', 'Standings'].map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Paper>
          {tab === 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>
                  Game information
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {match.competitionName || 'American football'} · {match.status}
                  {matchState?.clock ? ` · ${matchState.clock}` : ''}
                </Typography>
              </CardContent>
            </Card>
          ) : null}
          {tab === 1 ? (
            matchState?.periodScores?.length ? (
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Team</TableCell>
                      {matchState.periodScores.map((period) => (
                        <TableCell key={period.label} align="center">
                          {period.label}
                        </TableCell>
                      ))}
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(
                      [
                        [match.homeTeamName, 'home', match.homeScore],
                        [match.awayTeamName, 'away', match.awayScore],
                      ] as const
                    ).map(([name, side, total]) => (
                      <TableRow key={name}>
                        <TableCell sx={{ fontWeight: 900 }}>{name}</TableCell>
                        {matchState.periodScores.map((period) => (
                          <TableCell key={period.label} align="center">
                            {period[side]}
                          </TableCell>
                        ))}
                        <TableCell align="right" sx={{ fontWeight: 950 }}>
                          {total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ) : (
              <Typography color="text.secondary">
                Quarter scoring will appear when supplied by the provider.
              </Typography>
            )
          ) : null}
          {tab === 2 ? (
            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <Typography variant="h5" fontWeight={950} sx={{ p: 2 }}>
                Team statistics
              </Typography>
              {statLabels.length ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{details.statistics[0]?.teamName ?? 'Home'}</TableCell>
                      <TableCell align="center">Statistic</TableCell>
                      <TableCell align="right">
                        {details.statistics[1]?.teamName ?? 'Away'}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statLabels.map((label) => (
                      <TableRow key={label}>
                        <TableCell>
                          {String(
                            details.statistics[0]?.items.find((item) => item.label === label)
                              ?.value ?? '—',
                          )}
                        </TableCell>
                        <TableCell align="center">{label}</TableCell>
                        <TableCell align="right">
                          {String(
                            details.statistics[1]?.items.find((item) => item.label === label)
                              ?.value ?? '—',
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary" sx={{ p: 3 }}>
                  Statistics will appear when supplied by the provider.
                </Typography>
              )}
            </Paper>
          ) : null}
          {tab === 3 ? (
            details.standings.length ? (
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell align="right">W</TableCell>
                      <TableCell align="right">L</TableCell>
                      <TableCell align="right">Pts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.standings.map((row) => (
                      <TableRow key={row.teamProviderId}>
                        <TableCell>{row.position}</TableCell>
                        <TableCell sx={{ fontWeight: 850 }}>{row.teamName}</TableCell>
                        <TableCell align="right">{row.wins}</TableCell>
                        <TableCell align="right">{row.losses}</TableCell>
                        <TableCell align="right">{row.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ) : (
              <Typography color="text.secondary">
                Standings are not available for this competition yet.
              </Typography>
            )
          ) : null}
        </Stack>
      ) : null}
    </PageScaffold>
  );
}
