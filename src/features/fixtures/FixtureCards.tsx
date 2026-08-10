import { Box, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

import type { Fixture } from '../../types/api';
import { publicSportName } from '../../utils/publicSportName';
import { fixtureTitle, formatKickoff, statusLabel } from './fixtureFormat';

export function FixtureCards({ fixtures }: { fixtures: Fixture[] }) {
  return (
    <Stack spacing={1}>
      {fixtures.map((fixture) => (
        <Box
          key={fixture.uuid}
          component={RouterLink}
          to={`/fixtures/${fixture.uuid}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto',
            gap: 1,
            alignItems: 'center',
            px: 1.5,
            py: 1.1,
            color: 'text.primary',
            bgcolor: '#ffffff',
            borderLeft: '5px solid',
            borderColor: 'primary.main',
            boxShadow: '0 8px 18px rgba(7,25,45,.06)',
            '&:hover': {
              bgcolor: 'rgba(243,198,67,.08)',
            },
          }}
        >
          <Stack spacing={0.2} minWidth={0}>
            <Typography fontWeight={950} noWrap>
              {fixtureTitle(fixture)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {publicSportName(fixture.sport)} · {fixture.competition.name} ·{' '}
              {fixture.venue?.name ?? 'Venue TBC'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatKickoff(fixture)}
            </Typography>
          </Stack>
          <Chip
            size="small"
            label={statusLabel(fixture.status)}
            color="primary"
            sx={{ borderRadius: 2, minWidth: 72 }}
          />
        </Box>
      ))}
    </Stack>
  );
}
