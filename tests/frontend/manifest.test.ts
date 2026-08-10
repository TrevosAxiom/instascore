import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PWA manifest', () => {
  it('contains installable InstaScore metadata and required icon sizes', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8'),
    ) as {
      name: string;
      short_name: string;
      display: string;
      display_override: string[];
      scope: string;
      start_url: string;
      icons: { sizes: string; purpose?: string }[];
      shortcuts: unknown[];
      screenshots: unknown[];
    };

    expect(manifest.name).toBe('InstaScore Match Day');
    expect(manifest.short_name).toBe('InstaScore');
    expect(manifest.display).toBe('standalone');
    expect(manifest.display_override).toEqual(['standalone']);
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url).toBe('/?source=pwa');
    expect(manifest.icons.some((icon) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
    expect(manifest.screenshots.length).toBeGreaterThan(0);
  });
});
