import { Button, Container, Stack, Typography } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  public state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('InstaScore application error', error, info);
  }

  public render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={2} role="alert">
          <Typography variant="overline" color="primary">
            InstaScore
          </Typography>
          <Typography variant="h3">Something went wrong</Typography>
          <Typography color="text.secondary">
            The application shell could not continue. Reload the page to try again.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload InstaScore
          </Button>
        </Stack>
      </Container>
    );
  }
}
