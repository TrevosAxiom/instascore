import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import { SportIcon } from '../../components/SportSwitcher';

export function NewsArticlePage() {
  const api = useApi();
  const { postId = '' } = useParams();
  const query = useQuery({
    queryKey: ['news-article', postId],
    queryFn: () => api.getNewsItem(postId),
    enabled: Boolean(postId),
  });
  const item = query.data;
  const category = item?.categories[0];
  const categoryLabel = category?.slug === 'football' ? 'Soccer' : (category?.name ?? 'News');

  return (
    <PageScaffold
      eyebrow="InstaScore news"
      title={item?.title ?? 'Story'}
      description={item?.excerpt ?? 'The latest from across the game.'}
    >
      {query.isLoading ? <LoadingState label="Loading story" /> : null}
      {query.isError ? (
        <ErrorState
          title="This story could not be loaded."
          description="Return to the news page and choose another story."
        />
      ) : null}
      {item ? (
        <Stack spacing={2.5} sx={{ maxWidth: 1080, mx: 'auto' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            flexWrap="wrap"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<SportIcon sport={category?.slug ?? 'all'} />}
                label={categoryLabel}
                color="primary"
              />
              <Typography color="text.secondary">
                {new Date(item.publishedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </Typography>
            </Stack>
            <Button component={RouterLink} to="/news" variant="outlined">
              All news
            </Button>
          </Stack>
          <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: { xs: 3, md: 5 } }}>
            {item.imageUrl ? (
              <Box
                component="img"
                src={item.imageUrl}
                alt=""
                sx={{
                  display: 'block',
                  width: '100%',
                  maxHeight: { xs: 300, md: 560 },
                  objectFit: 'cover',
                  bgcolor: 'rgb(7,25,45)',
                }}
              />
            ) : (
              <Box
                sx={{
                  height: { xs: 210, md: 360 },
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgb(7,25,45)',
                  color: '#f7c638',
                  '& svg': { width: 88, height: 88 },
                }}
              >
                <SportIcon sport={category?.slug ?? 'all'} />
              </Box>
            )}
            <Box
              className="instascore-article-content"
              dangerouslySetInnerHTML={{ __html: item.content ?? '' }}
              sx={{
                px: { xs: 2, sm: 3, md: 7 },
                py: { xs: 2.5, md: 5 },
                color: 'text.primary',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.75,
                '& > :first-of-type': { mt: 0 },
                '& > :last-child': { mb: 0 },
                '& h2, & h3, & h4': { color: 'text.primary', lineHeight: 1.2, mt: 4 },
                '& a': { color: 'secondary.main', fontWeight: 800 },
                '& img, & video, & iframe': {
                  display: 'block',
                  maxWidth: '100%',
                  height: 'auto',
                  mx: 'auto',
                  borderRadius: 2,
                },
                '& iframe': { width: '100%', minHeight: { xs: 240, md: 500 } },
                '& figure': { m: 0, my: 3 },
                '& figcaption': { color: 'text.secondary', fontSize: '.85rem', mt: 1 },
                '& blockquote': {
                  m: 0,
                  my: 3,
                  pl: 2.5,
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  color: 'text.secondary',
                },
              }}
            />
          </Paper>
          {item.sourceUrl ? (
            <Button
              component="a"
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
            >
              Read original source
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </PageScaffold>
  );
}
