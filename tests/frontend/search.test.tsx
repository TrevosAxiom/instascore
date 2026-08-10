import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SearchPage } from '../../src/features/search/SearchPage';
import { renderApp, testApi } from './test-utils';

describe('global search UI', () => {
  it('searches across public sports entities and renders deep links', async () => {
    renderApp(<SearchPage />, {
      api: {
        ...testApi,
        search: () =>
          Promise.resolve([
            {
              type: 'competition',
              uuid: '00000000-0000-4000-8000-000000000021',
              label: 'Lagos Flag League',
              url: '/competitions/00000000-0000-4000-8000-000000000021',
            },
          ]),
      },
    });

    fireEvent.change(screen.getByLabelText(/search instascore/i), {
      target: { value: 'lagos' },
    });

    expect(await screen.findByText('Lagos Flag League')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lagos flag league/i })).toHaveAttribute(
      'href',
      '/competitions/00000000-0000-4000-8000-000000000021',
    );
  });
});
