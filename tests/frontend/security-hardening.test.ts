import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const pluginRoot = process.cwd();

function filesUnder(directory: string, extensions: string[]): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return filesUnder(path, extensions);
    return extensions.some((extension) => path.endsWith(extension)) ? [path] : [];
  });
}

describe('security hardening guardrails', () => {
  it('does not expose server-only provider or OneSignal secret config in browser source', () => {
    const browserFiles = filesUnder(join(pluginRoot, 'src'), ['.ts', '.tsx']);
    const combined = browserFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

    expect(combined).not.toMatch(
      /onesignal_rest_api_key|football_provider_api_key|basketball_provider_api_key/i,
    );
    expect(combined).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{16,}/);
  });

  it('keeps every custom REST route on an explicit permission callback', () => {
    const restFiles = filesUnder(join(pluginRoot, 'includes/REST'), ['.php']);

    for (const file of restFiles) {
      const source = readFileSync(file, 'utf8');
      const routeCount = (source.match(/register_rest_route\s*\(/g) ?? []).length;
      const permissionCount = (source.match(/'permission_callback'\s*=>/g) ?? []).length;
      expect(permissionCount, file).toBeGreaterThanOrEqual(routeCount);
    }
  });
});
