import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BasketballLivePage } from '../../src/features/basketball/BasketballLivePage';
import { renderApp } from './test-utils';

describe('basketball live game UI', () => {
  it('renders period scores and overtime from normalized sport-aware data', async () => {
    renderApp(<BasketballLivePage />);

    expect(await screen.findByText('Lagos Hoops')).toBeInTheDocument();
    expect(screen.getByText('104')).toBeInTheDocument();
    expect(screen.getAllByText('OT')).toHaveLength(2);
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('12 — 9')).toBeInTheDocument();
  });
});
