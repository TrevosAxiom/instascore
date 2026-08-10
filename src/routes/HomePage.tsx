import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { useEffect, useState } from 'react';

import { useApi } from '../api/context';
import { useAuth } from '../app/auth-context';
import fansCtaImage from '../assets/instascore-fans-cta.jpg';
import matchdayHeroImage from '../assets/instascore-soccer-action-hero-v2.jpg';
import basketballHeroImage from '../assets/instascore-basketball-hero.jpg';
import flagHeroImage from '../assets/instascore-flag-hero.jpg';
import { ErrorState } from '../components/AsyncStates';
import { FixtureCards } from '../features/fixtures/FixtureCards';
import { ProviderUpcomingCards } from '../features/fixtures/ProviderUpcomingCards';
import { HomeLiveCarousel } from '../features/fixtures/HomeLiveCarousel';
import { HomeNewsSection } from '../features/news/HomeNewsSection';
import { SportSwitcher } from '../components/SportSwitcher';

const destinations = [
  ['Fixtures', '/fixtures', 'Upcoming matches'],
  ['Results', '/results', 'Latest final scores'],
  ['Competitions', '/competitions', 'Leagues and tournaments'],
  ['Tables', '/standings', 'Current standings'],
] as const;

const heroSlides = [
  {
    sport: 'Flag Football',
    eyebrow: 'Flag football lives here',
    title: 'Fast plays, live scores and every flag pulled.',
    description:
      'Stay close to flag football fixtures, results and match-day action from kickoff to final whistle.',
    image: flagHeroImage,
    primary: ['View flag scores', '/scores?sport=flag-football'],
    secondary: ['Flag fixtures', '/fixtures?sport=flag-football'],
  },
  {
    sport: 'Soccer',
    eyebrow: 'Soccer match day',
    title: 'Every fixture. Every score. One trusted match centre.',
    description: 'Follow soccer competitions, live action, upcoming matches and current tables.',
    image: matchdayHeroImage,
    primary: ['View soccer scores', '/scores?sport=football'],
    secondary: ['Soccer fixtures', '/fixtures?sport=football'],
  },
  {
    sport: 'Basketball',
    eyebrow: 'Courtside with InstaScore',
    title: 'Every quarter, every run and every final score.',
    description:
      'Track basketball games, live periods, upcoming fixtures and league standings in one place.',
    image: basketballHeroImage,
    primary: ['View basketball scores', '/scores?sport=basketball'],
    secondary: ['Basketball fixtures', '/fixtures?sport=basketball'],
  },
] as const;

export function HomePage() {
  const api = useApi();
  const { state } = useAuth();
  const [sport, setSport] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const defaultSlide = heroSlides[0];
  const slide = heroSlides[activeSlide] ?? defaultSlide;
  useEffect(() => {
    if (sliderPaused) return;
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % heroSlides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [sliderPaused]);
  const moveSlide = (direction: number) =>
    setActiveSlide((current) => (current + direction + heroSlides.length) % heroSlides.length);
  const fixtures = useQuery({
    queryKey: ['home', 'fixtures'],
    queryFn: () => api.getFixtures(new URLSearchParams({ per_page: '50' })),
    refetchInterval: 30_000,
  });
  const providerFootball = useQuery({
    queryKey: ['home', 'api-football-live'],
    queryFn: api.getFootballLive,
    refetchInterval: 30_000,
  });
  const providerBasketball = useQuery({
    queryKey: ['home', 'api-basketball-live'],
    queryFn: api.getBasketballLive,
    refetchInterval: 30_000,
  });
  const upcomingFootball = useQuery({
    queryKey: ['home', 'football-upcoming'],
    queryFn: () => api.getProviderMatches('football', 'upcoming'),
  });
  const upcomingBasketball = useQuery({
    queryKey: ['home', 'basketball-upcoming'],
    queryFn: () => api.getProviderMatches('basketball', 'upcoming'),
  });
  const sports = useQuery({ queryKey: ['sports'], queryFn: api.getSports });
  const competitions = useQuery({
    queryKey: ['home', 'competitions'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });

  const matches = fixtures.data?.items ?? [];
  const sportMatches = matches.filter((fixture) => !sport || fixture.sport.slug === sport);
  const live = sportMatches.filter((fixture) =>
    ['warmup', 'live', 'halftime', 'interval'].includes(fixture.status),
  );
  const upcoming = sportMatches.filter((fixture) =>
    ['scheduled', 'postponed'].includes(fixture.status),
  );
  const providerLive = !sport || sport === 'football' ? (providerFootball.data ?? []) : [];
  const basketballLive = !sport || sport === 'basketball' ? (providerBasketball.data ?? []) : [];
  const providerUpcoming = [
    ...(!sport || sport === 'football' ? (upcomingFootball.data ?? []) : []),
    ...(!sport || sport === 'basketball' ? (upcomingBasketball.data ?? []) : []),
  ];
  const selectedSportName =
    sport === 'flag-football'
      ? 'Flag Football'
      : sport === 'football'
        ? 'Soccer'
        : sport === 'basketball'
          ? 'Basketball'
          : 'All sports';
  const selectedSportMatchCount =
    live.length +
    upcoming.length +
    providerLive.length +
    basketballLive.length +
    providerUpcoming.length;
  const loading = fixtures.isLoading || competitions.isLoading;
  const failed = fixtures.isError || competitions.isError;

  return (
    <Stack spacing={{ xs: 1.75, md: 3 }}>
      <Card
        role="region"
        aria-roledescription="carousel"
        aria-label="InstaScore sports highlights"
        data-no-page-swipe
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') moveSlide(-1);
          if (event.key === 'ArrowRight') moveSlide(1);
        }}
        onMouseEnter={() => setSliderPaused(true)}
        onMouseLeave={() => setSliderPaused(false)}
        onFocusCapture={() => setSliderPaused(true)}
        onBlurCapture={() => setSliderPaused(false)}
        onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStart === null) return;
          const distance = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
          if (Math.abs(distance) > 45) moveSlide(distance > 0 ? -1 : 1);
          setTouchStart(null);
        }}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 5,
          backgroundImage: `linear-gradient(90deg, rgba(4,17,32,.99) 0%, rgba(7,25,45,.9) 47%, rgba(7,25,45,.2) 82%), url(${slide.image})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          color: '#fff5d6',
          minHeight: { xs: 390, sm: 430, md: 470 },
        }}
      >
        <CardContent
          sx={{
            p: { xs: 1.75, sm: 2.5, md: 4.5 },
            position: 'relative',
            zIndex: 1,
            minHeight: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Stack spacing={{ xs: 1.5, md: 3 }} sx={{ width: '100%', maxWidth: 740 }}>
            <Box>
              <Chip
                className="instascore-live-chip"
                label={slide.eyebrow}
                color="primary"
                size="small"
                sx={{ mb: 1.5, fontWeight: 950 }}
              />
              <Typography component="h1" variant="h3" fontWeight={950} letterSpacing="-.04em">
                {slide.title}
              </Typography>
              <Typography sx={{ mt: 1, maxWidth: 680, color: 'rgba(255,245,214,.76)' }}>
                {slide.description}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2.5 }}>
                <Button
                  component={RouterLink}
                  to={slide.primary[1]}
                  variant="contained"
                  size="large"
                >
                  {slide.primary[0]}
                </Button>
                <Button
                  component={RouterLink}
                  to={slide.secondary[1]}
                  variant="outlined"
                  size="large"
                  sx={{ color: '#fff5d6', borderColor: 'rgba(255,245,214,.55)' }}
                >
                  {slide.secondary[0]}
                </Button>
              </Stack>
            </Box>
          </Stack>
          <IconButton
            className="instascore-hero-arrow is-left"
            aria-label="Previous sport"
            onClick={() => moveSlide(-1)}
            sx={{
              position: 'absolute',
              left: { xs: 10, md: 22 },
              top: '50%',
              width: { xs: 42, md: 50 },
              height: { xs: 42, md: 50 },
              color: '#fff5d6',
              border: '1px solid rgba(243,198,67,.62)',
              bgcolor: 'rgba(7,25,45,.78)',
              '&:hover': { bgcolor: 'rgba(7,25,45,.85)' },
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 24 24"
              sx={{ width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2 }}
            >
              <path d="m15 18-6-6 6-6" />
            </Box>
          </IconButton>
          <IconButton
            className="instascore-hero-arrow is-right"
            aria-label="Next sport"
            onClick={() => moveSlide(1)}
            sx={{
              position: 'absolute',
              right: { xs: 10, md: 22 },
              top: '50%',
              width: { xs: 42, md: 50 },
              height: { xs: 42, md: 50 },
              color: '#fff5d6',
              border: '1px solid rgba(243,198,67,.62)',
              bgcolor: 'rgba(7,25,45,.78)',
              '&:hover': { bgcolor: 'rgba(7,25,45,.85)' },
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 24 24"
              sx={{ width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2 }}
            >
              <path d="m9 18 6-6-6-6" />
            </Box>
          </IconButton>
          <Stack
            direction="row"
            spacing={0.65}
            sx={{
              position: 'absolute',
              zIndex: 2,
              bottom: 18,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {heroSlides.map((item, index) => (
              <Box
                key={item.sport}
                component="button"
                type="button"
                aria-label={`Show ${item.sport} slide`}
                aria-current={index === activeSlide ? 'true' : undefined}
                onClick={() => setActiveSlide(index)}
                sx={{
                  width: index === activeSlide ? 18 : 7,
                  minWidth: index === activeSlide ? 18 : 7,
                  minHeight: '7px !important',
                  height: 7,
                  p: 0,
                  border: '1px solid rgba(255,255,255,.72)',
                  borderRadius: 99,
                  cursor: 'pointer',
                  bgcolor: index === activeSlide ? 'secondary.main' : 'rgba(7,25,45,.65)',
                  boxShadow: index === activeSlide ? '0 0 0 2px rgba(243,198,67,.16)' : 'none',
                  transition: 'width .25s ease, background-color .25s ease, transform .25s ease',
                  '&:hover': { transform: 'scale(1.12)', bgcolor: 'secondary.main' },
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {failed && <ErrorState title="The latest platform activity could not be loaded." />}

      <Stack spacing={1.25}>
        <Typography variant="overline" color="primary.main" fontWeight={950}>
          Explore every sport
        </Typography>
        <SportSwitcher sports={sports.data ?? []} value={sport} onChange={setSport} />
        {!loading && sport && selectedSportMatchCount === 0 ? (
          <Card variant="outlined" sx={{ borderStyle: 'dashed' }}>
            <CardContent sx={{ py: { xs: 2, md: 2.5 } }}>
              <Typography fontWeight={950}>No {selectedSportName} matches available</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                There are currently no live, scheduled or recently published matches under this
                sport. Choose another sport or check back after the schedule is updated.
              </Typography>
              <Button size="small" onClick={() => setSport('')} sx={{ mt: 1 }}>
                Show all sports
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </Stack>

      {live.length + providerLive.length + basketballLive.length > 0 && (
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="overline" color="primary.main" fontWeight={950}>
                Live now
              </Typography>
              <Typography variant="h4" fontWeight={950}>
                Matches in progress
              </Typography>
            </Box>
            <Button component={RouterLink} to="/scores" variant="contained">
              Open live scores
            </Button>
          </Stack>
          <HomeLiveCarousel football={providerLive} basketball={basketballLive} fixtures={live} />
        </>
      )}

      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={950}>
            Coming up
          </Typography>
          <Typography variant="h4" fontWeight={950}>
            Next fixtures
          </Typography>
        </Box>
        <Button component={RouterLink} to="/fixtures" variant="outlined">
          Full schedule
        </Button>
      </Stack>

      {!loading && upcoming.length + providerUpcoming.length ? (
        <Stack spacing={1}>
          <FixtureCards fixtures={upcoming.slice(0, 6)} />
          <ProviderUpcomingCards matches={providerUpcoming.slice(0, 6)} />
        </Stack>
      ) : !loading ? (
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight={950}>
              {sport
                ? `No ${selectedSportName} fixtures are scheduled yet`
                : 'No fixtures are scheduled yet'}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {sport
                ? `There are no upcoming ${selectedSportName} fixtures. Try another sport or check back after the next schedule import.`
                : 'Published fixtures will appear here as soon as the competition organiser adds them.'}
            </Typography>
            {sport ? (
              <Button variant="outlined" size="small" onClick={() => setSport('')} sx={{ mt: 2 }}>
                View all fixtures
              </Button>
            ) : null}
            {state?.user?.capabilities.manageFixtures ? (
              <Button
                component={RouterLink}
                to="/admin/fixtures"
                variant="contained"
                sx={{ mt: 2 }}
              >
                Schedule a fixture
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={1.25}>
        {(sports.data ?? []).map((item) => {
          const competitionCount = (competitions.data?.items ?? []).filter(
            (competition) => competition.sport.slug === item.slug,
          ).length;
          const matchCount = matches.filter((fixture) => fixture.sport.slug === item.slug).length;
          return (
            <Grid key={item.uuid} size={{ xs: 12, sm: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" fontWeight={950}>
                    {item.name}
                  </Typography>
                  <Typography color="text.secondary">
                    {matchCount} matches · {competitionCount} competitions
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Button component={RouterLink} to={`/fixtures?sport=${item.slug}`}>
                      Fixtures
                    </Button>
                    <Button component={RouterLink} to={`/standings?sport=${item.slug}`}>
                      Tables
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <HomeNewsSection />

      <Card
        sx={{
          overflow: 'hidden',
          borderRadius: 5,
          bgcolor: '#07192d',
          color: '#fff5d6',
        }}
      >
        <Grid container>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              component="img"
              src={fansCtaImage}
              alt="Supporters celebrating while following a match on their phones"
              loading="lazy"
              sx={{
                width: '100%',
                height: { xs: 280, md: 390 },
                display: 'block',
                objectFit: 'cover',
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <CardContent sx={{ p: { xs: 2.5, md: 4.5 } }}>
              <Typography variant="overline" color="primary.main" fontWeight={950}>
                Make it yours
              </Typography>
              <Typography variant="h4" fontWeight={950} letterSpacing="-.035em">
                Your teams. Your alerts. Every big moment.
              </Typography>
              <Typography sx={{ mt: 1, color: 'rgba(255,245,214,.74)', maxWidth: 560 }}>
                Follow the clubs and competitions you care about, then keep scores, fixtures and
                match updates one tap away.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2.5 }}>
                <Button component={RouterLink} to="/favourites" variant="contained">
                  Choose your favourites
                </Button>
                <Button
                  component={RouterLink}
                  to="/notifications"
                  variant="text"
                  sx={{ color: '#fff5d6' }}
                >
                  Set match alerts
                </Button>
              </Stack>
            </CardContent>
          </Grid>
        </Grid>
      </Card>

      <Grid container spacing={1.25}>
        {destinations.map(([title, path, detail]) => (
          <Grid key={path} size={{ xs: 6, md: 3 }}>
            <Button
              component={RouterLink}
              to={path}
              fullWidth
              variant="outlined"
              sx={{ display: 'block', p: 1.75, minHeight: 96, textAlign: 'left', borderRadius: 4 }}
            >
              <Typography fontWeight={950}>{title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {detail}
              </Typography>
            </Button>
          </Grid>
        ))}
      </Grid>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <Chip label={`${competitions.data?.total ?? 0} active competitions`} />
        {state?.user?.capabilities.accessAdmin ? (
          <Button component={RouterLink} to="/admin" variant="outlined">
            Manage your competition
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
