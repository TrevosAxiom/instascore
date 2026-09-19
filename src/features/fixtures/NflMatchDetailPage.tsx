import {
  Box,
  Card,
  CardContent,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';

export function NflMatchDetailPage() {
  const api = useApi();
  const { providerId = '' } = useParams();
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
            </CardContent>
          </Card>
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
                    <TableCell align="right">{details.statistics[1]?.teamName ?? 'Away'}</TableCell>
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
        </Stack>
      ) : null}
    </PageScaffold>
  );
}
