import { Chip, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

import { EntityAvatar } from '../../components/EntityAvatar';
import type { ProviderUpcomingMatch } from '../../types/api';

export function ProviderUpcomingCards({
  matches,
  kind = 'upcoming',
  sport,
}: {
  matches: ProviderUpcomingMatch[];
  kind?: 'upcoming' | 'finished';
  sport?: 'football' | 'basketball' | 'nfl';
}) {
  const groups = Object.entries(
    matches.reduce<Record<string, ProviderUpcomingMatch[]>>((result, match) => {
      (result[match.competitionName || 'Other matches'] ??= []).push(match);
      return result;
    }, {}),
  );
  return (
    <Stack spacing={1.5}>
      {groups.map(([competition, competitionMatches]) => (
        <Paper key={competition} variant="outlined" sx={{ overflow: 'hidden', borderRadius: 3 }}>
          <Typography fontWeight={950} sx={{ px: 1.5, py: 1, bgcolor: 'rgba(7,25,45,.045)' }}>
            {competition}
          </Typography>
          {competitionMatches.map((match) => {
            const matchSport = sport ?? ('sport' in match ? match.sport : 'football');
            const basketball = matchSport === 'basketball';
            const href = basketball
              ? `/basketball/matches/${match.providerId}`
              : matchSport === 'nfl'
                ? `/nfl/matches/${match.providerId}`
                : `/football/matches/${match.providerId}`;
            return (
              <Paper
                key={`${matchSport}-${match.providerId}`}
                component={RouterLink}
                to={href}
                elevation={0}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '76px minmax(0,1fr)', sm: '112px minmax(0,1fr) auto' },
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: 0,
                  border: 0,
                  borderTop: 1,
                  borderColor: 'divider',
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover': { boxShadow: 2 },
                }}
              >
                <Stack spacing={0.25}>
                  <Chip
                    label={kind === 'finished' ? 'FT' : 'Upcoming'}
                    size="small"
                    color={kind === 'finished' ? 'default' : 'primary'}
                  />
                  <Typography variant="caption" textAlign="center">
                    {match.kickoffAt
                      ? new Intl.DateTimeFormat(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(match.kickoffAt))
                      : 'Time TBC'}
                  </Typography>
                </Stack>
                <Stack spacing={0.35}>
                  {(
                    [
                      [match.homeTeamName, match.homeTeamLogoUrl, match.homeScore],
                      [match.awayTeamName, match.awayTeamLogoUrl, match.awayScore],
                    ] as const
                  ).map(([name, logo, score]) => (
                    <Stack key={name} direction="row" alignItems="center" spacing={0.75}>
                      <EntityAvatar
                        entity="team"
                        src={logo}
                        alt={`${name} logo`}
                        sx={{ width: 26, height: 26 }}
                      />
                      <Typography noWrap fontWeight={850} sx={{ flex: 1 }}>
                        {name}
                      </Typography>
                      {kind === 'finished' ? (
                        <Typography fontWeight={950}>{score}</Typography>
                      ) : null}
                    </Stack>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  ›
                </Typography>
              </Paper>
            );
          })}
        </Paper>
      ))}
    </Stack>
  );
}
