import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useApi } from '../api/context';
import { useAuth } from '../app/auth-context';
import type { OneSignalSettings } from '../types/api';
import {
  initializeOneSignal,
  loginOneSignal,
  logoutOneSignal,
  readOneSignalSubscription,
} from './oneSignalAdapter';

export function OneSignalProvider({
  children,
  settings,
}: PropsWithChildren<{ settings: OneSignalSettings | undefined }>) {
  const api = useApi();
  const { state } = useAuth();
  const userUuid = state?.user?.uuid ?? '';

  useEffect(() => {
    if (!settings?.enabled) {
      return;
    }
    void initializeOneSignal(settings);
  }, [settings]);

  useEffect(() => {
    if (!settings?.enabled || state === null) {
      return;
    }

    if (!userUuid) {
      void logoutOneSignal(settings);
      return;
    }

    void loginOneSignal(userUuid, settings).then(async () => {
      const subscription = await readOneSignalSubscription(settings);
      if (subscription.subscriptionId) {
        await api.syncNotificationSubscription(subscription);
      }
    });
  }, [api, settings, state, userUuid]);

  return children;
}
