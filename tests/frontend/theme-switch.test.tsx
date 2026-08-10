import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeToggle } from '../../src/components/ThemeToggle';
import { useThemeStore } from '../../src/state/themeStore';
import { renderApp } from './test-utils';

describe('Theme switch', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ preference: 'system' });
  });

  it('persists a dark theme override and applies it to the document', () => {
    renderApp(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));

    expect(localStorage.getItem('instascore-theme')).toBe('dark');
    expect(document.documentElement.dataset.instascoreTheme).toBe('dark');
  });
});
