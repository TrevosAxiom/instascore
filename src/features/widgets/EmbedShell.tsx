import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import logo from '../../assets/instascore-logo-brand.png';

export function EmbedShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.paper',
        color: 'text.primary',
        border: '2px solid',
        borderColor: 'primary.main',
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Box component="img" src={logo} alt="InstaScore" sx={{ height: 28, width: 'auto' }} />
          <Typography variant="caption" fontWeight={900} color="primary.dark">
            {title}
          </Typography>
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
