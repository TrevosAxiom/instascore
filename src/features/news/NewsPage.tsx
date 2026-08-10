import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { SportSwitcher } from '../../components/SportSwitcher';

export function NewsPage() {
  const api = useApi();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const news = useQuery({
    queryKey: ['news', category, page],
    queryFn: () => api.getNewsArchive(category, page),
  });

  const changeCategory = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <PageScaffold
      eyebrow="Latest stories"
      title="News"
      description="Reports, interviews and updates from every sport covered by InstaScore."
      status={category ? 'Filtered news' : 'All news'}
    >
      <Stack spacing={2.5}>
        <SportSwitcher sports={[]} value={category} onChange={changeCategory} />
        {news.isLoading && <LoadingState label="Loading news" />}
        {news.isError && <ErrorState title="News could not be loaded." />}
        {news.data && news.data.items.length === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6">No stories in this section yet</Typography>
              <Typography color="text.secondary">
                Try another sport or return to All sports to browse every published story.
              </Typography>
              {category && <Button onClick={() => changeCategory('')}>Show all news</Button>}
            </CardContent>
          </Card>
        )}
        <Grid container spacing={2}>
          {news.data?.items.map((item) => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card component="article" sx={{ height: '100%', overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: 190,
                    bgcolor: 'rgb(7,25,45)',
                    backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <CardContent>
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        color="primary"
                        label={
                          item.categories[0]?.slug === 'football'
                            ? 'Soccer'
                            : (item.categories[0]?.name ?? 'News')
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                    <Typography variant="h6" fontWeight={900}>
                      {item.title}
                    </Typography>
                    {item.excerpt && <Typography color="text.secondary">{item.excerpt}</Typography>}
                    <Button component="a" href={item.url} sx={{ alignSelf: 'flex-start' }}>
                      Read story
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {news.data && news.data.totalPages > 1 && (
          <Stack alignItems="center">
            <Pagination
              page={news.data.page}
              count={news.data.totalPages}
              color="primary"
              onChange={(_, value) => {
                setPage(value);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </Stack>
        )}
      </Stack>
    </PageScaffold>
  );
}
