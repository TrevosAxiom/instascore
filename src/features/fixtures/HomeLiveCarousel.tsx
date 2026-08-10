import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { EntityAvatar } from '../../components/EntityAvatar';
import type { BasketballLiveGame, Fixture, FootballProviderLiveGame } from '../../types/api';
import { publicSportName } from '../../utils/publicSportName';

interface LiveCarouselItem {
  id: string;
  href: string;
  homeName: string;
  awayName: string;
  homeLogo: string | undefined;
  awayLogo: string | undefined;
  homeScore: number | string;
  awayScore: number | string;
  competition: string;
  detail: string;
}

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

export function HomeLiveCarousel({
  football,
  basketball,
  fixtures,
}: {
  football: FootballProviderLiveGame[];
  basketball: BasketballLiveGame[];
  fixtures: Fixture[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(0);
  const items: LiveCarouselItem[] = [
    ...football.map((match) => ({
      id: `football-${match.providerId}`,
      href: `/football/matches/${match.providerId}`,
      homeName: match.homeTeamName,
      awayName: match.awayTeamName,
      homeLogo: match.homeTeamLogoUrl,
      awayLogo: match.awayTeamLogoUrl,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      competition: match.competitionName,
      detail: match.elapsed ? `${match.elapsed}'` : (match.statusShort ?? 'Live'),
    })),
    ...basketball.map((match) => ({
      id: `basketball-${match.providerId}`,
      href: `/basketball/matches/${match.providerId}`,
      homeName: match.homeTeamName,
      awayName: match.awayTeamName,
      homeLogo: match.homeTeamLogoUrl,
      awayLogo: match.awayTeamLogoUrl,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      competition: match.competitionName ?? 'Basketball',
      detail: `${match.sportState.periodLabel}${match.sportState.clock ? ` · ${match.sportState.clock}` : ''}`,
    })),
    ...fixtures.map((match) => ({
      id: `fixture-${match.uuid}`,
      href: `/fixtures/${match.uuid}`,
      homeName: match.homeTeam.name,
      awayName: match.awayTeam.name,
      homeLogo: undefined,
      awayLogo: undefined,
      homeScore: '–',
      awayScore: '–',
      competition: match.competition.name,
      detail: publicSportName(match.sport),
    })),
  ];
  const pages = chunks(items, 3);
  const selectPage = (index: number) => {
    const scroller = scrollerRef.current;
    const page = scroller?.children.item(index) as HTMLElement | null;
    if (!scroller || !page) return;
    scroller.scrollTo({ left: page.offsetLeft - scroller.offsetLeft, behavior: 'smooth' });
    setActivePage(index);
  };

  return (
    <Stack spacing={0.35}>
      <Box
        ref={scrollerRef}
        aria-label="Live matches carousel"
        onScroll={(event) => {
          const scroller = event.currentTarget;
          const positions = Array.from(scroller.children).map((child) =>
            Math.abs((child as HTMLElement).offsetLeft - scroller.offsetLeft - scroller.scrollLeft),
          );
          const closest = positions.indexOf(Math.min(...positions));
          if (closest >= 0 && closest !== activePage) setActivePage(closest);
        }}
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: '100%', md: 'calc(50% - 6px)' },
          gap: 1.5,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          pb: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {pages.map((column, index) => (
          <Stack key={index} spacing={1} sx={{ scrollSnapAlign: 'start' }}>
            {column.map((match) => (
              <Paper
                key={match.id}
                component={RouterLink}
                to={match.href}
                variant="outlined"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '58px minmax(0,1fr) auto',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: 3,
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover': { boxShadow: 2 },
                }}
              >
                <Stack spacing={0.25}>
                  <Chip label="LIVE" color="success" size="small" />
                  <Typography variant="caption" textAlign="center" fontWeight={900}>
                    {match.detail}
                  </Typography>
                </Stack>
                <Stack spacing={0.35}>
                  {(
                    [
                      [match.homeName, match.homeLogo, match.homeScore],
                      [match.awayName, match.awayLogo, match.awayScore],
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
                      <Typography fontWeight={950}>{score}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Typography color="text.secondary">›</Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ gridColumn: '2 / 4' }}
                >
                  {match.competition}
                </Typography>
              </Paper>
            ))}
          </Stack>
        ))}
      </Box>
      {pages.length > 1 ? (
        <Stack direction="row" justifyContent="center" spacing={0.35} aria-label="Live match pages">
          {pages.map((_page, index) => (
            <Box
              key={index}
              component="button"
              type="button"
              aria-label={`Show live matches page ${index + 1}`}
              aria-current={index === activePage ? 'true' : undefined}
              onClick={() => selectPage(index)}
              sx={{
                width: 18,
                minWidth: 18,
                minHeight: '18px !important',
                height: 18,
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                '&::after': {
                  content: '""',
                  display: 'block',
                  width: index === activePage ? 12 : 5,
                  height: 5,
                  mx: 'auto',
                  borderRadius: 99,
                  bgcolor: index === activePage ? 'primary.main' : 'rgba(7,25,45,.3)',
                  transition: 'width .2s ease, background-color .2s ease',
                },
              }}
            />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
