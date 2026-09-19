import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '../../src/app/AppRoutes';
import type { AuthContextValue } from '../../src/app/auth-context';
import { adminAuth, renderApp } from './test-utils';

function roleAuth(
  displayName: string,
  roles: string[],
  capabilities: Partial<
    NonNullable<NonNullable<AuthContextValue['state']>['user']>['capabilities']
  >,
): AuthContextValue {
  return {
    ...adminAuth,
    state: {
      authenticated: true,
      nonce: 'test',
      theme: 'system',
      user: {
        ...adminAuth.state!.user!,
        displayName,
        roles,
        capabilities: {
          ...Object.fromEntries(
            Object.keys(adminAuth.state!.user!.capabilities).map((capability) => [
              capability,
              false,
            ]),
          ),
          ...capabilities,
        } as NonNullable<NonNullable<AuthContextValue['state']>['user']>['capabilities'],
      },
    },
  };
}

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

  it('uses a dedicated sidebar workspace for operational users', async () => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, { route: '/dashboard', auth: adminAuth });

    expect(
      await screen.findByRole('heading', { name: 'Welcome back, League Admin' }),
    ).toBeInTheDocument();
    const workspace = screen.getByRole('navigation', { name: 'Administration navigation' });
    expect(within(workspace).getAllByRole('link', { name: 'Competitions' }).length).toBeGreaterThan(
      0,
    );
    expect(
      within(workspace).getAllByRole('link', { name: 'Teams & players' }).length,
    ).toBeGreaterThan(0);
    expect(
      within(workspace).getAllByRole('link', { name: 'View public site' }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Powered by Lagos Wolverines')).not.toBeInTheDocument();
  });

  it.each([
    [
      'team manager',
      roleAuth('Team Manager', ['instascore_team_administrator'], {
        accessAdmin: true,
        manageTeams: true,
        managePlayers: true,
      }),
      'Team manager',
      'Teams & players',
    ],
    [
      'umpire',
      roleAuth('Match Umpire', ['instascore_match_official'], {}),
      'Umpire / official',
      'Today’s fixtures',
    ],
  ])('gives the %s a focused workspace menu', async (_name, auth, role, expectedLink) => {
    renderApp(<AppRoutes loginUrl="/wp-login.php" />, { route: '/dashboard', auth });

    expect(await screen.findByText(role)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: expectedLink }).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('navigation', { name: 'Primary navigation' }),
    ).not.toBeInTheDocument();
  });
});
