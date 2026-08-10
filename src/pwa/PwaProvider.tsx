import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { BootstrapSettings } from '../types/api';
import { registerServiceWorker } from './registerServiceWorker';
import { detectInstallGuide, isStandaloneDisplay, type InstallGuide } from './installGuide';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaState {
  online: boolean;
  standalone: boolean;
  installAvailable: boolean;
  installGuide: InstallGuide;
  serviceWorkerRegistered: boolean;
  serviceWorkerError: string;
  lastUpdatedAt: string | null;
  updateAvailable: boolean;
  wakeLockActive: boolean;
  nativeCapabilities: {
    share: boolean;
    wakeLock: boolean;
    vibration: boolean;
    badging: boolean;
    push: boolean;
  };
  setLastUpdatedAt: (value?: string) => void;
  promptInstall: () => Promise<void>;
  applyUpdate: () => void;
  share: (input?: ShareData) => Promise<boolean>;
  setWakeLock: (active: boolean) => Promise<boolean>;
  setBadge: (count?: number) => Promise<void>;
}

const PwaContext = createContext<PwaState | null>(null);

export function PwaProvider({
  children,
  settings,
}: PropsWithChildren<{ settings: BootstrapSettings }>) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(isStandaloneDisplay);
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
  const [serviceWorkerError, setServiceWorkerError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAtState] = useState<string | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [wakeLock, setWakeLockState] = useState<WakeLockSentinel | null>(null);
  const installGuide = useMemo(() => detectInstallGuide(), []);

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('instascore-standalone', standalone);
    return () => document.body.classList.remove('instascore-standalone');
  }, [standalone]);

  useEffect(() => {
    void registerServiceWorker(settings).then((result) => {
      setServiceWorkerRegistered(result.registered);
      setServiceWorkerError(result.error ?? '');
      const registration = result.registration;
      if (!registration) return;
      if (registration.waiting) setWaitingWorker(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller)
            setWaitingWorker(worker);
        });
      });
    });
  }, [settings]);

  useEffect(() => {
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', captureInstall);
    const installed = () => {
      setInstallEvent(null);
      setStandalone(true);
    };
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const displayChanged = () => setStandalone(isStandaloneDisplay());
    window.addEventListener('appinstalled', installed);
    displayMode.addEventListener?.('change', displayChanged);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', installed);
      displayMode.removeEventListener?.('change', displayChanged);
    };
  }, []);

  const value = useMemo<PwaState>(
    () => ({
      online,
      standalone,
      installAvailable: Boolean(installEvent),
      installGuide,
      serviceWorkerRegistered,
      serviceWorkerError,
      lastUpdatedAt,
      updateAvailable: Boolean(waitingWorker),
      wakeLockActive: Boolean(wakeLock),
      nativeCapabilities: {
        share: typeof navigator.share === 'function',
        wakeLock: 'wakeLock' in navigator,
        vibration: typeof navigator.vibrate === 'function',
        badging: 'setAppBadge' in navigator,
        push: 'PushManager' in window,
      },
      setLastUpdatedAt: (value = new Date().toISOString()) => setLastUpdatedAtState(value),
      async promptInstall() {
        if (!installEvent) {
          return;
        }
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
      },
      applyUpdate() {
        waitingWorker?.postMessage({ type: 'INSTASCORE_SKIP_WAITING' });
        window.location.reload();
      },
      async share(input = {}) {
        if (typeof navigator.share !== 'function') return false;
        try {
          await navigator.share({
            title: input.title ?? 'InstaScore',
            text: input.text ?? 'Live scores, fixtures and results on InstaScore.',
            url: input.url ?? window.location.href,
          });
          return true;
        } catch {
          return false;
        }
      },
      async setWakeLock(active) {
        if (!active) {
          await wakeLock?.release();
          setWakeLockState(null);
          return false;
        }
        if (!('wakeLock' in navigator)) return false;
        try {
          const sentinel = await navigator.wakeLock.request('screen');
          sentinel.addEventListener('release', () => setWakeLockState(null), { once: true });
          setWakeLockState(sentinel);
          return true;
        } catch {
          return false;
        }
      },
      async setBadge(count) {
        const badgeNavigator = navigator as Navigator & {
          setAppBadge?: (value?: number) => Promise<void>;
          clearAppBadge?: () => Promise<void>;
        };
        try {
          if (count && badgeNavigator.setAppBadge) await badgeNavigator.setAppBadge(count);
          else if (badgeNavigator.clearAppBadge) await badgeNavigator.clearAppBadge();
        } catch {
          // Badging is optional and must not interrupt scores.
        }
      },
    }),
    [
      installEvent,
      installGuide,
      lastUpdatedAt,
      online,
      serviceWorkerError,
      serviceWorkerRegistered,
      standalone,
      waitingWorker,
      wakeLock,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within PwaProvider.');
  }
  return context;
}
