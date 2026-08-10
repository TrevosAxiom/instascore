import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type PropsWithChildren } from 'react';

import { createApiClient } from '../api/client';
import { ApiContext } from '../api/context';
import { PwaProvider } from '../pwa/PwaProvider';
import { OneSignalProvider } from '../onesignal/OneSignalProvider';
import { FavouritesProvider } from '../favourites/FavouritesProvider';
import type { BootstrapSettings } from '../types/api';
import { AuthProvider } from './AuthProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeProvider } from './ThemeProvider';

interface Props extends PropsWithChildren {
  settings: BootstrapSettings;
}

export function AppProviders({ children, settings }: Props) {
  const api = useMemo(() => createApiClient(settings), [settings]);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
    [],
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ApiContext.Provider value={api}>
          <AuthProvider>
            <PwaProvider settings={settings}>
              <OneSignalProvider settings={settings.oneSignal}>
                <FavouritesProvider>
                  <ThemeProvider>{children}</ThemeProvider>
                </FavouritesProvider>
              </OneSignalProvider>
            </PwaProvider>
          </AuthProvider>
        </ApiContext.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
