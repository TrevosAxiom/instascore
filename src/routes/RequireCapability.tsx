import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '../app/auth-context';
import { ErrorState, LoadingState } from '../components/AsyncStates';
import type { AuthUser } from '../types/api';

type Capability = keyof AuthUser['capabilities'];

export function RequireCapability({ capability }: { capability: Capability }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <LoadingState label="Checking access" />;
  }

  if (auth.isError) {
    return <ErrorState title="We could not verify your access." />;
  }

  if (!auth.state?.authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!auth.state.user?.capabilities[capability]) {
    return <ErrorState title="You do not have permission to open this area." />;
  }

  return <Outlet />;
}
