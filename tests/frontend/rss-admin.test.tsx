import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('RSS administration', () => {
  it('uploads a CSV file and reports its import result', async () => {
    const importRssCsv = vi.fn((_file: File) =>
      Promise.resolve({ imported: 2, skipped: 1, errors: [], fatalError: '' }),
    );
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, {
      route: '/admin/rss',
      auth: adminAuth,
      api: { ...testApi, importRssCsv },
    });

    expect(await screen.findByRole('heading', { name: 'RSS news settings' })).toBeInTheDocument();
    const file = new File(
      ['site,rss_url,category,status\nESPN,https://example.com/feed,football,active'],
      'feeds.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(screen.getByLabelText('RSS CSV file'), { target: { files: [file] } });

    await waitFor(() => expect(importRssCsv).toHaveBeenCalled());
    expect(importRssCsv.mock.calls[0]?.[0]).toBe(file);
    expect(await screen.findByText(/2 added, 1 duplicates skipped/i)).toBeInTheDocument();
  });
});
