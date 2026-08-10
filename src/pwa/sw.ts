/// <reference lib="webworker" />

import { clientsClaim, type WorkboxPlugin } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';
import { enable as enableNavigationPreload } from 'workbox-navigation-preload';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const CACHE_VERSION = 'm7-v1';
const API_PREFIX = '/wp-json/instascore/v1';
const expirationPlugin = (options: ConstructorParameters<typeof ExpirationPlugin>[0]) =>
  new ExpirationPlugin(options) as unknown as WorkboxPlugin;

void self.skipWaiting();
void clientsClaim();
enableNavigationPreload();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' &&
    !url.pathname.startsWith('/wp-admin/') &&
    !url.pathname.includes('login.php') &&
    !url.pathname.startsWith('/wp-json/'),
  new NetworkFirst({
    cacheName: `instascore-pages-${CACHE_VERSION}`,
    networkTimeoutSeconds: 4,
    plugins: [
      expirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
);

setCatchHandler(async ({ event }) => {
  const request = (event as FetchEvent).request;
  if (request.mode === 'navigate') {
    return (await caches.match('/offline.html')) ?? Response.error();
  }

  return Response.error();
});

registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith(API_PREFIX) &&
    /\/fixtures\/[^/]+\/live$|\/football\/live$|\/basketball\/live$|\/fixtures$|\/results$/.test(
      url.pathname,
    ),
  new NetworkFirst({
    cacheName: `instascore-live-${CACHE_VERSION}`,
    networkTimeoutSeconds: 4,
    plugins: [
      expirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 10,
      }),
    ],
  }),
);

registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith(API_PREFIX) &&
    /\/competitions|\/standings|\/statistics|\/teams|\/players|\/sports/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: `instascore-catalog-${CACHE_VERSION}`,
    plugins: [
      expirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 60 * 12,
      }),
    ],
  }),
);

registerRoute(
  ({ url, request }) =>
    request.method !== 'GET' ||
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/admin/') ||
    url.pathname.includes('/operations/'),
  new NetworkOnly(),
);

registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.startsWith('/wp-content/plugins/instascore-platform/dist/')),
  new CacheFirst({
    cacheName: `instascore-assets-${CACHE_VERSION}`,
    plugins: [
      expirationPlugin({
        maxEntries: 160,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'INSTASCORE_SKIP_WAITING') {
    void self.skipWaiting();
  }
});
