import { Chip, Grid, Paper, Stack, Typography } from '@mui/material';

import type { LiveMatchState } from '../../types/api';

export function LiveScoreboard({ state }: { state: LiveMatchState }) {
  return (
    <Paper
      variant="outlined"
      role="status"
      aria-live={state.provisional ? 'polite' : 'off'}
      aria-label={`${state.fixture.homeTeam.name} ${state.score.home}, ${state.fixture.awayTeam.name} ${state.score.away}. ${state.clock.periodLabel || 'Pregame'}.`}
      sx={{
        p: 2,
        borderRadius: 5,
        borderColor: 'rgba(242,200,75,.58)',
        background: 'linear-gradient(180deg,#11223d,#0d1b31)',
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid size={5}>
          <Typography variant="overline">{state.fixture.homeTeam.name}</Typography>
          <Typography variant="h2" sx={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
            {state.score.home}
          </Typography>
        </Grid>
        <Grid size={2} textAlign="center">
          <Stack spacing={1} alignItems="center">
            <Chip label={state.provisional ? 'Provisional' : 'Confirmed'} color="primary" />
            <Typography fontWeight={900}>{state.clock.periodLabel || 'Pregame'}</Typography>
            <Typography variant="caption" color="text.secondary">
              {state.clock.running ? 'Clock running' : state.clock.status}
            </Typography>
          </Stack>
        </Grid>
        <Grid size={5} textAlign="right">
          <Typography variant="overline">{state.fixture.awayTeam.name}</Typography>
          <Typography variant="h2" sx={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
            {state.score.away}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}
