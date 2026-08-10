import { create } from 'zustand';

import type { ThemePreference } from '../types/api';

const storageKey = 'instascore-theme';

function storedPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(storageKey);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'light';
  } catch {
    return 'light';
  }
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: storedPreference(),
  setPreference(preference) {
    try {
      localStorage.setItem(storageKey, preference);
    } catch {
      // Storage may be disabled; in-memory preference remains usable.
    }
    set({ preference });
  },
}));
