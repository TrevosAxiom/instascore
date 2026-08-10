import type { BootstrapSettings } from '../types/api';

export interface ServiceWorkerRegistrationResult {
  supported: boolean;
  registered: boolean;
  registration?: ServiceWorkerRegistration;
  error?: string;
}

export async function registerServiceWorker(
  settings: BootstrapSettings,
): Promise<ServiceWorkerRegistrationResult> {
  if (!('serviceWorker' in navigator) || !settings.serviceWorkerUrl) {
    return { supported: false, registered: false };
  }

  try {
    const registration = await navigator.serviceWorker.register(settings.serviceWorkerUrl, {
      scope: '/',
    });
    return { supported: true, registered: true, registration };
  } catch (error) {
    return {
      supported: true,
      registered: false,
      error: error instanceof Error ? error.message : 'Service worker registration failed.',
    };
  }
}
