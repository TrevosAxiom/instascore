import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';

const categories = [
  ['cffl', 'CFFL'],
  ['flag-football', 'Flag Football'],
  ['football', 'Soccer'],
  ['basketball', 'Basketball'],
] as const;

export function HomeNewsSection() {
  const api = useApi();
  const { state } = useAuth();
  const [category, setCategory] = useState<(typeof categories)[number][0]>('cffl');
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

      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {categories.map(([slug, label]) => (
          <Button
            key={slug}
            onClick={() => setCategory(slug)}
            variant={category === slug ? 'contained' : 'outlined'}
            aria-pressed={category === slug}
            sx={{ flexShrink: 0, borderRadius: 99 }}
          >
            {label}
          </Button>
        ))}
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

      <Grid container spacing={1.5}>
        {news.data?.slice(0, 4).map((item, index) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: index === 0 ? 6 : 2 }}>
            <Card
              component="a"
              href={item.url}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: index === 0 ? 360 : 300,
                borderRadius: 4,
                overflow: 'hidden',
                color: '#fff5d6',
                backgroundImage: item.imageUrl
                  ? `linear-gradient(180deg, rgba(7,25,45,.05), rgba(7,25,45,.96)), url(${item.imageUrl})`
                  : 'linear-gradient(145deg, rgba(7,25,45,.84), rgb(7,25,45))',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <CardContent sx={{ mt: 'auto', p: 2.5 }}>
                <Chip
                  size="small"
                  color="primary"
                  label={item.categories[0]?.slug === 'football' ? 'Soccer' : (item.categories[0]?.name ?? 'News')}
                  sx={{ mb: 1 }}
                />
                <Typography variant={index === 0 ? 'h4' : 'h6'} fontWeight={950}>
                  {item.title}
                </Typography>
                {index === 0 && item.excerpt ? (
                  <Typography sx={{ mt: 1, color: 'rgba(255,245,214,.72)' }}>
                    {item.excerpt}
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
