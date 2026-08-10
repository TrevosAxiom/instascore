import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useApi } from '../api/context';
import { useThemeStore } from '../state/themeStore';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const api = useApi();
  const setThemePreference = useThemeStore((state) => state.setPreference);
  const query = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: api.getAuthState,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    try {
      if (!query.data?.theme || localStorage.getItem('instascore-theme')) {
        return;
      }
      setThemePreference(query.data.theme);
    } catch {
      // Browser storage is optional; keep the in-memory system preference.
    }
  }, [query.data?.theme, setThemePreference]);

  return (
    <AuthContext.Provider
      value={{
        state: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
