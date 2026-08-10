import type { BootstrapSettings } from '../types/api';

const fallback: BootstrapSettings = {
  apiBase: import.meta.env.VITE_INSTASCORE_API_BASE ?? '/wp-json/instascore/v1',
  appBase: import.meta.env.VITE_INSTASCORE_APP_BASE ?? '',
  loginUrl: '/login',
  nonce: null,
};

export function readBootstrapSettings(): BootstrapSettings {
  const element = document.getElementById('instascore-bootstrap');
  if (!element?.textContent) {
    return fallback;
  }

  try {
    return { ...fallback, ...(JSON.parse(element.textContent) as Partial<BootstrapSettings>) };
  } catch {
    return fallback;
  }
}
