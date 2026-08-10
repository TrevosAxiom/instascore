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
import { useState } from 'react';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';

const sections = ['Overview', 'Box score', 'Play-by-play', 'Team stats'];

export function BasketballMatchDetailPage() {
  const api = useApi();
  const { providerId = '' } = useParams();
  const [tab, setTab] = useState(0);
  const query = useQuery({
    queryKey: ['basketball-match', providerId],
    queryFn: api.getBasketballLive,
    refetchInterval: 30_000,
  });
  const match = query.data?.find((game) => game.providerId === providerId);

  return (
    <PageScaffold
      eyebrow={match?.competitionName ?? 'Basketball match centre'}
      title={match ? `${match.homeTeamName} vs ${match.awayTeamName}` : 'Basketball match centre'}
      description="Live period scoring, quarter breakdown and match information."
      status={match?.status ?? 'Basketball'}
    >
      {query.isLoading ? <LoadingState label="Loading basketball match" /> : null}
      {query.isError ? <ErrorState title="Basketball match could not be loaded." /> : null}
      {!query.isLoading && !query.isError && !match ? (
        <EmptyState
          title="Match no longer live"
          description="This provider game has left the live feed. Final box-score data will appear here when available."
        />
      ) : null}
      {match ? (
        <Stack spacing={2}>
          <Card
            sx={{
              borderRadius: 4,
              color: '#fff5d6',
              background: 'linear-gradient(135deg,rgb(7,25,45),rgb(17,58,94))',
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Chip label={match.competitionName ?? 'Basketball'} color="primary" />
                <Chip
                  label={`${match.sportState.periodLabel}${match.sportState.clock ? ` · ${match.sportState.clock}` : ''}`}
                  color="success"
                />
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 1.5,
                  mt: 2,
                }}
              >
                {(
                  [
                    [match.homeTeamName, match.homeTeamLogoUrl],
                    [match.awayTeamName, match.awayTeamLogoUrl],
                  ] as const
                ).map(([name, logo], index) => (
                  <Stack
                    key={name}
                    alignItems="center"
                    textAlign="center"
                    spacing={0.75}
                    sx={{ gridColumn: index ? 3 : 1, gridRow: 1 }}
                  >
                    <EntityAvatar
                      entity="team"
                      src={logo}
                      alt={`${name} logo`}
                      sx={{
                        width: { xs: 58, sm: 78 },
                        height: { xs: 58, sm: 78 },
                        bgcolor: '#fff',
                      }}
                    />
                    <Typography fontWeight={950}>{name}</Typography>
                  </Stack>
                ))}
                <Typography
                  variant="h2"
                  fontWeight={950}
                  whiteSpace="nowrap"
                  sx={{ gridColumn: 2, gridRow: 1 }}
                >
                  {match.homeScore}–{match.awayScore}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Tabs
              value={tab}
              onChange={(_, value: number) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Basketball match sections"
            >
              {sections.map((section) => (
                <Tab key={section} label={section} />
              ))}
            </Tabs>
          </Paper>
          {tab === 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" fontWeight={950}>
                  Game status
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  <Chip label={match.status} color="success" />
                  <Chip
                    label={`${match.sportState.overtimePeriods} overtime period${match.sportState.overtimePeriods === 1 ? '' : 's'}`}
                  />
                  <Chip
                    label={
                      match.sportState.scoreReconciled
                        ? 'Score verified'
                        : 'Provider score updating'
                    }
                  />
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          {tab === 1 ? (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Team</TableCell>
                    {match.sportState.periodScores.map((period) => (
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
                      {match.sportState.periodScores.map((period) => (
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
          ) : null}
          {tab === 2 ? (
            <EmptyState
              title="Play-by-play coming from the provider"
              description="Possessions and scoring plays will populate here as soon as the live feed supplies them."
            />
          ) : null}
          {tab === 3 ? (
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Scoring statistic</TableCell>
                    <TableCell align="center">{match.homeTeamName}</TableCell>
                    <TableCell align="center">{match.awayTeamName}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['Total points', match.homeScore, match.awayScore],
                    [
                      'Regulation points',
                      match.sportState.periodScores
                        .filter((period) => period.label.startsWith('Q'))
                        .reduce((sum, period) => sum + period.home, 0),
                      match.sportState.periodScores
                        .filter((period) => period.label.startsWith('Q'))
                        .reduce((sum, period) => sum + period.away, 0),
                    ],
                    [
                      'Overtime points',
                      match.sportState.periodScores
                        .filter((period) => period.label.startsWith('OT'))
                        .reduce((sum, period) => sum + period.home, 0),
                      match.sportState.periodScores
                        .filter((period) => period.label.startsWith('OT'))
                        .reduce((sum, period) => sum + period.away, 0),
                    ],
                    [
                      'Best period',
                      Math.max(...match.sportState.periodScores.map((period) => period.home)),
                      Math.max(...match.sportState.periodScores.map((period) => period.away)),
                    ],
                    [
                      'Periods won',
                      match.sportState.periodScores.filter((period) => period.home > period.away)
                        .length,
                      match.sportState.periodScores.filter((period) => period.away > period.home)
                        .length,
                    ],
                  ].map(([label, home, away]) => (
                    <TableRow key={label}>
                      <TableCell sx={{ fontWeight: 850 }}>{label}</TableCell>
                      <TableCell align="center">{home}</TableCell>
                      <TableCell align="center">{away}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ p: 1.5 }}>
                Shooting, rebounds, assists, steals, blocks, turnovers and fouls will extend this
                table when supplied by the provider.
              </Typography>
            </Paper>
          ) : null}
        </Stack>
      ) : null}
    </PageScaffold>
  );
}
