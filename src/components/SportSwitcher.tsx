import { Box, Button, Stack, Tooltip } from '@mui/material';

import type { Sport } from '../types/api';
import { publicSportName } from '../utils/publicSportName';

const order = ['flag-football', 'football', 'basketball'];
const requiredSports: Sport[] = [
  { uuid: 'flag-football', slug: 'flag-football', name: 'Flag Football' },
  { uuid: 'football', slug: 'football', name: 'Soccer' },
  { uuid: 'basketball', slug: 'basketball', name: 'Basketball' },
];

export function SportIcon({ sport }: { sport: string }) {
  const common = { width: 23, height: 23, viewBox: '0 0 24 24', fill: 'none' } as const;
  if (sport === 'basketball') {
    return (
      <Box component="svg" {...common} aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M4 8c4 1 8 5 12 12M8 4c1 4 5 8 12 12M3 13h18M12 3c-2 5-2 13 0 18"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Box>
    );
  }
  if (sport === 'football') {
    return (
      <Box component="svg" {...common} aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="m12 7 3 2-1 4h-4L9 9l3-2Zm-7 3 4-1m6 0 4 1M10 13l-3 4m7-4 3 4M9 20l3-3 3 3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Box>
    );
  }
  if (sport === 'flag-football' || sport === 'flag') {
    return (
      <Box component="svg" {...common} aria-hidden>
        <path
          d="M4 6h10l-2 4 2 4H4V6Zm0 0v14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M16 6c4 1 5 5 2 8-2 2-5 1-6-1" stroke="currentColor" strokeWidth="1.5" />
      </Box>
    );
  }
  return (
    <Box component="svg" {...common} aria-hidden>
      <path
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </Box>
  );
}

export function SportSwitcher({
  sports,
  value,
  onChange,
  includeAll = true,
}: {
  sports: Sport[];
  value: string;
  onChange: (slug: string) => void;
  includeAll?: boolean;
}) {
  const available = new Map(requiredSports.map((sport) => [sport.slug, sport]));
  sports.forEach((sport) => available.set(sport.slug, sport));
  const sorted = [...available.values()].sort((a, b) => {
    const ai = order.indexOf(a.slug);
    const bi = order.indexOf(b.slug);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  const options = includeAll ? [{ uuid: 'all', slug: '', name: 'All sports' }, ...sorted] : sorted;
  return (
    <Stack
      role="tablist"
      aria-label="Sports"
      direction="row"
      spacing={{ xs: 0.75, sm: 1 }}
      sx={{ overflowX: 'auto', p: 1, bgcolor: 'rgb(7,25,45)', borderRadius: 3, mb: 2 }}
    >
      {options.map((sport) => {
        const active = value === sport.slug;
        const displayName = publicSportName(sport);
        return (
          <Tooltip key={sport.uuid} title={displayName} placement="top">
            <Button
              role="tab"
              aria-selected={active}
              aria-label={displayName}
              variant={active ? 'contained' : 'text'}
              onClick={() => onChange(sport.slug)}
              startIcon={<SportIcon sport={sport.slug} />}
              sx={{
                flex: { xs: 1, sm: '0 0 auto' },
                minWidth: { xs: 52, sm: 120 },
                px: { xs: 1, sm: 2 },
                color: active ? 'rgb(7,25,45)' : '#fff',
                bgcolor: active ? 'primary.main' : 'transparent',
                borderBottom: '3px solid',
                borderColor: active ? 'primary.main' : 'transparent',
                '& .MuiButton-startIcon': { m: { xs: 0, sm: '0 8px 0 0' } },
                '&:hover': { bgcolor: active ? 'primary.light' : 'rgba(255,255,255,.1)' },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {displayName}
              </Box>
            </Button>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
