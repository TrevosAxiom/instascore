import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { SportIcon } from '../../components/SportSwitcher';
import type { NewsItem } from '../../types/api';

const categories = [
  ['', 'All'],
  ['cffl', 'CFFL'],
  ['flag-football', 'Flag Football'],
  ['football', 'Soccer'],
  ['basketball', 'Basketball'],
] as const;

export function HomeNewsSection() {
  const api = useApi();
  const { state } = useAuth();
  const [category, setCategory] = useState<(typeof categories)[number][0]>('');
  const news = useQuery({
    queryKey: ['home', 'news', category],
    queryFn: () => api.getNews(category),
  });

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
      >
        <Box>
          <Typography variant="overline" color="primary.dark" fontWeight={950}>
            Latest stories
          </Typography>
          <Typography variant="h4" fontWeight={950} letterSpacing="-.035em">
            Around the game
          </Typography>
        </Box>
        <Button component={RouterLink} to="/news" variant="outlined">
          All news
        </Button>
      </Stack>

      <Stack
        role="tablist"
        aria-label="News categories"
        direction="row"
        spacing={0.75}
        sx={{
          overflowX: 'auto',
          p: 0.75,
          bgcolor: 'rgb(7,25,45)',
          borderRadius: 3,
          boxShadow: '0 12px 30px rgba(7,25,45,.12)',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {categories.map(([slug, label]) => {
          const active = category === slug;
          return (
            <Button
              key={slug || 'all'}
              role="tab"
              aria-label={label}
              aria-selected={active}
              onClick={() => setCategory(slug)}
              variant={active ? 'contained' : 'text'}
              startIcon={<SportIcon sport={slug || 'all'} />}
              sx={{
                flexShrink: 0,
                minWidth: { xs: 48, sm: 'auto' },
                minHeight: 46,
                px: { xs: 1, sm: 1.5, md: 2.25 },
                borderRadius: 2.25,
                color: active ? 'rgb(7,25,45)' : '#fff',
                bgcolor: active ? 'primary.main' : 'transparent',
                '& .MuiButton-startIcon': { m: { xs: 0, sm: '0 8px 0 0' } },
                '&:hover': { bgcolor: active ? 'primary.light' : 'rgba(255,255,255,.1)' },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {label}
              </Box>
            </Button>
          );
        })}
      </Stack>

      {news.isLoading ? <LoadingState label="Loading the latest stories" /> : null}
      {news.isError ? <ErrorState title="News could not be loaded." /> : null}
      {!news.isLoading && !news.isError && news.data?.length === 0 ? (
        <Card sx={{ borderRadius: 4, bgcolor: '#07192d', color: '#fff5d6' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Typography variant="h5" fontWeight={950}>
              {categories.find(([slug]) => slug === category)?.[1]} stories are coming
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,245,214,.72)' }}>
              Reports, interviews and match-day updates published in this category will appear here.
            </Typography>
            {state?.user?.capabilities.accessAdmin ? (
              <Button href="/wp-admin/post-new.php" variant="contained" sx={{ mt: 2 }}>
                Publish the first story
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {news.data?.length ? (
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 7 }}>
            <StoryCard item={news.data[0]!} featured />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.5}>
              {news.data.slice(1, 4).map((item) => (
                <StoryCard key={item.id} item={item} />
              ))}
            </Stack>
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
}

function StoryCard({ item, featured = false }: { item: NewsItem; featured?: boolean }) {
  const categoryLabel =
    item.categories[0]?.slug === 'football' ? 'Soccer' : (item.categories[0]?.name ?? 'News');
  return (
    <Card
      component="a"
      href={item.url}
      sx={{
        display: 'flex',
        position: 'relative',
        flexDirection: featured ? 'column' : 'row',
        height: featured ? { xs: 340, md: 468 } : { xs: 132, md: 147 },
        borderRadius: 3.5,
        overflow: 'hidden',
        color: '#fff',
        textDecoration: 'none',
        bgcolor: 'rgb(7,25,45)',
        backgroundImage: featured
          ? item.imageUrl
            ? `linear-gradient(180deg, rgba(7,25,45,.06) 18%, rgba(7,25,45,.94) 100%), url(${item.imageUrl})`
            : 'linear-gradient(145deg, #173b5d, rgb(7,25,45))'
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'transform .2s ease, box-shadow .2s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 18px 34px rgba(7,25,45,.2)' },
      }}
    >
      {!featured && (
        <Box
          sx={{
            width: { xs: 118, sm: 160 },
            flexShrink: 0,
            backgroundImage: item.imageUrl
              ? `linear-gradient(rgba(7,25,45,.08), rgba(7,25,45,.18)), url(${item.imageUrl})`
              : 'linear-gradient(145deg, #244d71, rgb(7,25,45))',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <CardContent
        sx={{
          mt: featured ? 'auto' : 0,
          p: featured ? { xs: 2.25, md: 3.25 } : { xs: 1.5, md: 2 },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: featured ? 'flex-end' : 'center',
          '&:last-child': { pb: featured ? { xs: 2.25, md: 3.25 } : { xs: 1.5, md: 2 } },
        }}
      >
        <Chip
          size="small"
          color="primary"
          label={categoryLabel}
          sx={{ mb: 1, alignSelf: 'flex-start' }}
        />
        <Typography
          variant={featured ? 'h4' : 'subtitle1'}
          fontWeight={950}
          sx={{
            lineHeight: featured ? 1.08 : 1.2,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: featured ? 3 : 2,
            overflow: 'hidden',
          }}
        >
          {item.title}
        </Typography>
        {featured && item.excerpt ? (
          <Typography
            sx={{
              mt: 1.25,
              maxWidth: 760,
              color: 'rgba(255,255,255,.76)',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {item.excerpt}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
