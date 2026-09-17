import { Box, Stack, Typography } from '@mui/material';

import { EntityAvatar } from '../../components/EntityAvatar';
import type { Fixture, LiveMatchState } from '../../types/api';

export function BroadcastScoreOverlay({
  fixture,
  state,
  compact = false,
}: {
  fixture: Fixture;
  state: LiveMatchState;
  compact?: boolean;
}) {
  const possession = [...state.events]
    .reverse()
    .find((event) => !event.voided && event.eventType === 'possession_change')?.teamSide;
  const clock = formatClock(state.clock.clockSeconds);

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={`${fixture.homeTeam.name} ${state.score.home}, ${fixture.awayTeam.name} ${state.score.away}. ${state.clock.periodLabel || 'Pregame'}, ${clock}.`}
      sx={{
        position: 'absolute',
        zIndex: 3,
        left: { xs: compact ? 6 : 8, sm: 16 },
        right: { xs: compact ? 6 : 8, sm: 16 },
        bottom: { xs: compact ? 6 : 8, sm: 16 },
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: compact ? 560 : 760,
          color: '#fff',
          bgcolor: 'rgba(7,25,45,.92)',
          border: '1px solid rgba(255,205,55,.68)',
          borderRadius: compact ? 1.5 : 2.5,
          boxShadow: '0 12px 34px rgba(0,0,0,.36)',
          backdropFilter: 'blur(10px)',
          px: { xs: 1, sm: 1.5 },
          py: compact ? 0.55 : { xs: 0.75, sm: 1 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Team
            side="home"
            name={fixture.homeTeam.name}
            logo={fixture.homeTeam.logoUrl}
            score={state.score.home}
            possession={possession === 'home'}
            compact={compact}
          />
          <Stack alignItems="center" spacing={0} sx={{ minWidth: { xs: 54, sm: 76 } }}>
            <Typography
              sx={{
                color: '#ffd447',
                fontSize: compact ? '.63rem' : '.72rem',
                fontWeight: 950,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              {state.clock.periodLabel || 'Pregame'}
            </Typography>
            <Typography
              sx={{
                fontSize: compact ? '1rem' : { xs: '1.05rem', sm: '1.35rem' },
                lineHeight: 1.1,
                fontWeight: 950,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {clock}
            </Typography>
            {state.provisional ? (
              <Typography sx={{ fontSize: '.55rem', opacity: 0.7 }}>PROVISIONAL</Typography>
            ) : null}
          </Stack>
          <Team
            side="away"
            name={fixture.awayTeam.name}
            logo={fixture.awayTeam.logoUrl}
            score={state.score.away}
            possession={possession === 'away'}
            compact={compact}
          />
        </Box>
      </Box>
    </Box>
  );
}

function Team({
  side,
  name,
  logo,
  score,
  possession,
  compact,
}: {
  side: 'home' | 'away';
  name: string;
  logo?: string | null | undefined;
  score: number;
  possession: boolean;
  compact: boolean;
}) {
  return (
    <Stack
      direction={side === 'home' ? 'row' : 'row-reverse'}
      gap={{ xs: 0.5, sm: 1 }}
      alignItems="center"
      minWidth={0}
    >
      <EntityAvatar
        entity="team"
        src={logo}
        alt={`${name} logo`}
        sx={{
          width: compact ? 24 : { xs: 28, sm: 36 },
          height: compact ? 24 : { xs: 28, sm: 36 },
          bgcolor: '#fff',
          flexShrink: 0,
        }}
      />
      <Box minWidth={0} sx={{ textAlign: side === 'home' ? 'left' : 'right', flexGrow: 1 }}>
        <Typography
          noWrap
          sx={{ fontSize: compact ? '.68rem' : { xs: '.72rem', sm: '.88rem' }, fontWeight: 900 }}
        >
          {possession ? '◆ ' : ''}
          {name}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: compact ? '1.15rem' : { xs: '1.35rem', sm: '1.75rem' },
          fontWeight: 950,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {score}
      </Typography>
    </Stack>
  );
}

function formatClock(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
