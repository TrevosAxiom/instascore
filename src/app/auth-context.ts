import { createContext, useContext } from 'react';

import type { AuthState } from '../types/api';

export interface AuthContextValue {
  state: AuthState | null;
  isLoading: boolean;
  isError: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  state: null,
  isLoading: true,
  isError: false,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
