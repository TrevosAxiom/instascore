import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

export function LoadingState({ label = 'Loading InstaScore' }: { label?: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ minHeight: { xs: 140, sm: 220 } }}>
      <CircularProgress size={32} color="primary" />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {description}
      </Typography>
    </Box>
  );
}

export function ErrorState({
  title = 'Unable to load this view',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      <Stack>
        <strong>{title}</strong>
        {description}
      </Stack>
    </Alert>
  );
}
