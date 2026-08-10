import type { OneSignalSettings } from '../types/api';

type OneSignalSdk = {
  init: (options: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Slidedown?: { promptPush: () => Promise<void> };
  Notifications?: { requestPermission: () => Promise<boolean> };
  User?: {
    onesignalId?: string;
    PushSubscription?: { id?: string; optedIn?: boolean };
    addTags?: (tags: Record<string, string>) => Promise<void>;
    removeTags?: (keys: string[]) => Promise<void>;
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void | Promise<void>>;
  }
}

let initPromise: Promise<OneSignalSdk | null> | null = null;
let lastExternalId = '';

export function resetOneSignalAdapterForTests() {
  initPromise = null;
  lastExternalId = '';
}

export function initializeOneSignal(settings?: OneSignalSettings): Promise<OneSignalSdk | null> {
  if (!settings?.enabled || !settings.appId) {
    return Promise.resolve(null);
  }

  initPromise ??= new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: settings.appId,
          serviceWorkerPath: settings.serviceWorkerPath,
          // Keep push isolated from the root-scoped offline PWA worker. Registering
          // both at `/` causes the most recently loaded worker to replace the other.
          serviceWorkerParam: { scope: '/push/onesignal/' },
          allowLocalhostAsSecureOrigin: true,
          promptOptions: { slidedown: { enabled: true } },
        });
        resolve(OneSignal);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('OneSignal initialisation failed'));
      }
    });

    if (!document.querySelector(`script[src="${settings.sdkUrl}"]`)) {
      const script = document.createElement('script');
      script.src = settings.sdkUrl;
      script.defer = true;
      script.async = true;
      script.onerror = () => reject(new Error('Unable to load OneSignal Web SDK.'));
      document.head.append(script);
    }
  });

  return initPromise;
}

export async function loginOneSignal(externalId: string, settings?: OneSignalSettings) {
  const sdk = await initializeOneSignal(settings);
  if (!sdk || !externalId || lastExternalId === externalId) {
    return;
  }
  await sdk.login(externalId);
  lastExternalId = externalId;
}

export async function logoutOneSignal(settings?: OneSignalSettings) {
  const sdk = await initializeOneSignal(settings);
  if (!sdk || !lastExternalId) {
    return;
  }
  await sdk.logout();
  lastExternalId = '';
}

export async function promptForPush(settings?: OneSignalSettings) {
  const sdk = await initializeOneSignal(settings);
  if (!sdk) {
    return false;
  }
  if (sdk.Slidedown?.promptPush) {
    await sdk.Slidedown.promptPush();
    return true;
  }
  return sdk.Notifications?.requestPermission ? sdk.Notifications.requestPermission() : false;
}

export async function readOneSignalSubscription(settings?: OneSignalSettings) {
  const sdk = await initializeOneSignal(settings);
  return {
    oneSignalId: sdk?.User?.onesignalId ?? '',
    subscriptionId: sdk?.User?.PushSubscription?.id ?? '',
    status: sdk?.User?.PushSubscription?.optedIn ? 'active' : 'pending',
    deviceLabel: navigator.userAgent,
  };
}

export async function updateOneSignalTags(
  tags: Record<string, string>,
  settings?: OneSignalSettings,
) {
  const sdk = await initializeOneSignal(settings);
  const user = sdk?.User as
    | {
        addTags?: (tags: Record<string, string>) => Promise<void>;
        removeTags?: (keys: string[]) => Promise<void>;
      }
    | undefined;
  if (!user) {
    return;
  }
  const active = Object.fromEntries(Object.entries(tags).filter(([, value]) => value !== ''));
  const removed = Object.entries(tags)
    .filter(([, value]) => value === '')
    .map(([key]) => key);
  if (Object.keys(active).length && user.addTags) {
    await user.addTags(active);
  }
  if (removed.length && user.removeTags) {
    await user.removeTags(removed);
  }
}
