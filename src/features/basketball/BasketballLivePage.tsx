import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncStates';
import { EntityAvatar } from '../../components/EntityAvatar';
import { PageScaffold } from '../../components/PageScaffold';

export function BasketballLivePage() {
  const api = useApi();
  const query = useQuery({
    queryKey: ['basketball', 'live'],
    queryFn: api.getBasketballLive,
    refetchInterval: 30_000,
  });

  return (
    <PageScaffold
      eyebrow="Basketball"
      title="Live games"
      description="Basketball match centre with period scores, overtime support and cached provider timestamps."
      status="Basketball"
    >
      {query.isLoading ? <LoadingState label="Loading basketball games" /> : null}
      {query.isError ? (
        <ErrorState description="Basketball live games could not be loaded." />
      ) : null}
      {query.data?.length === 0 ? (
        <EmptyState
          title="No basketball games cached"
          description="Run a basketball live sync from provider administration to populate cached game data."
        />
      ) : null}
      <Stack spacing={2}>
        {query.data?.map((game) => (
          <Box
            className="instascore-panel"
            component={RouterLink}
            to={`/basketball/matches/${game.providerId}`}
            key={game.providerId}
            sx={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Box>
                <Typography variant="overline">{game.competitionName ?? 'Basketball'}</Typography>
                <Typography color="text.secondary" fontWeight={800}>
                  {game.sportState.periodLabel}
                  {game.sportState.clock ? ` · ${game.sportState.clock}` : ''}
                </Typography>
              </Box>
              <Chip label={game.status} color={game.status === 'live' ? 'success' : 'default'} />
            </Stack>
            <Stack spacing={1.5} sx={{ mt: 2.5 }}>
              {[
                {
                  name: game.homeTeamName,
                  score: game.homeScore,
                  logo: game.homeTeamLogoUrl,
                },
                {
                  name: game.awayTeamName,
                  score: game.awayScore,
                  logo: game.awayTeamLogoUrl,
                },
              ].map((team) => (
                <Stack key={team.name} direction="row" alignItems="center" spacing={1.5}>
                  <EntityAvatar
                    entity="team"
                    src={team.logo}
                    alt={`${team.name} logo`}
                    sx={{ width: 40, height: 40 }}
                  />
                  <Typography variant="h6" fontWeight={900} sx={{ flex: 1 }}>
                    {team.name}
                  </Typography>
                  <Typography variant="h4" fontWeight={950}>
                    {team.score}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            {!game.sportState.scoreReconciled ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Provider quarter totals do not reconcile with the full score. Treat this as cached
                provider data until the next sync resolves it.
              </Alert>
            ) : null}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                gap: 1.5,
                mt: 3,
              }}
            >
              {game.sportState.periodScores.map((period) => (
                <Box
                  key={period.label}
                  sx={{ borderTop: '3px solid', borderColor: 'primary.main', pt: 1 }}
                >
                  <Typography fontWeight={900}>{period.label}</Typography>
                  <Typography color="text.secondary">
                    {period.home} — {period.away}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Stack>
    </PageScaffold>
  );
}
