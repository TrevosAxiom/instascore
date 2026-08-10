import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  children?: ReactNode;
}

export function PageScaffold({ eyebrow, title, description, status, children }: Props) {
  return (
    <Stack spacing={{ xs: 1.5, md: 3 }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gap: { xs: 1, md: 2 },
          alignItems: 'end',
          p: { xs: 1.5, sm: 2.5, md: 3.5 },
          borderRadius: { xs: 3, md: 5 },
          color: '#fff5d6',
          background:
            'radial-gradient(circle at 88% 15%, rgba(243,198,67,.3), transparent 17%), linear-gradient(125deg, rgb(7,25,45) 0%, rgba(7,25,45,.92) 68%, rgba(7,25,45,.78) 100%)',
          boxShadow: '0 18px 45px rgba(7,25,45,.14)',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 180,
            height: 180,
            right: -65,
            bottom: -115,
            borderRadius: '50%',
            border: '24px solid rgba(255,255,255,.07)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="overline" color="primary.main" fontWeight={950} letterSpacing=".1em">
            {eyebrow}
          </Typography>
          <Typography
            component="h1"
            variant="h3"
            sx={{
              color: '#fff5d6',
              fontWeight: 950,
              letterSpacing: '-.055em',
              lineHeight: 0.95,
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            {title}
          </Typography>
          <Typography
            fontSize={{ xs: 13, sm: 15, md: 17 }}
            lineHeight={1.45}
            sx={{ mt: { xs: 0.5, md: 1 }, color: 'rgba(255,245,214,.72)', maxWidth: 760 }}
          >
            {description}
          </Typography>
        </Box>
        {status ? (
          <Chip
            label={status}
            color="primary"
            sx={{ borderRadius: 99, justifySelf: 'start', position: 'relative', zIndex: 1 }}
          />
        ) : null}
      </Box>
      <Box>{children}</Box>
    </Stack>
  );
}
