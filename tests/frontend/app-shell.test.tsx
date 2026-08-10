import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import { renderApp } from './test-utils';

describe('App shell', () => {
  it('renders the requested public route with shared navigation', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, { route: '/scores' });

    expect(await screen.findByRole('heading', { name: 'Scores' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'InstaScore home' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Flag$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Soccer$/i })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: /Basketball/i }));
    expect(await screen.findByText('Lagos Hoops')).toBeInTheDocument();
    expect(screen.getByText('104')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lagos Hoops.*Abuja Nets/i })).toHaveAttribute(
      'href',
      '/basketball/matches/game-1',
    );
  });

  it('shows the four editorial news categories on the homepage', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, { route: '/' });

    expect(await screen.findByRole('heading', { name: 'Around the game' })).toBeInTheDocument();
    const newsTabs = within(screen.getByRole('tablist', { name: 'News categories' }));
    expect(newsTabs.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(newsTabs.getByRole('tab', { name: 'CFFL' })).toBeInTheDocument();
    expect(newsTabs.getByRole('tab', { name: 'Flag Football' })).toBeInTheDocument();
    expect(newsTabs.getByRole('tab', { name: 'Soccer' })).toBeInTheDocument();
    expect(newsTabs.getByRole('tab', { name: 'Basketball' })).toBeInTheDocument();
  });

  it('shows the complete paginated news archive with an all-sports default', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, { route: '/news' });

    expect(await screen.findByRole('heading', { name: 'News' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All sports' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Soccer' })).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
