import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '../app/auth-context';
import { ErrorState, LoadingState } from '../components/AsyncStates';

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.isLoading) return <LoadingState label="Loading your dashboard" />;
  if (auth.isError) return <ErrorState title="We could not load your account." />;
  if (!auth.state?.authenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <Outlet />;
}
