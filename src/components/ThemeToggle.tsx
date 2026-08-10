import { IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

import { useApi } from '../api/context';
import { useAuth } from '../app/auth-context';
import { useThemeStore } from '../state/themeStore';
import type { ThemePreference } from '../types/api';

const labels: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const api = useApi();
  const auth = useAuth();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const changeTheme = (_event: React.MouseEvent<HTMLElement>, value: ThemePreference | null) => {
    if (!value) return;
    setPreference(value);
    if (auth.state?.authenticated) {
      void api.setTheme(value).catch(() => undefined);
    }
  };

  const setTheme = (value: ThemePreference) => {
    setPreference(value);
    if (auth.state?.authenticated) void api.setTheme(value).catch(() => undefined);
  };

  if (compact) {
    const next = preference === 'dark' ? 'light' : 'dark';
    return (
      <Tooltip title={`Switch to ${next} mode`}>
        <IconButton
          aria-label={`Switch to ${next} mode`}
          onClick={() => setTheme(next)}
          sx={{ color: 'text.primary', border: 1, borderColor: 'divider', width: 40, height: 40 }}
        >
          {preference === 'dark' ? (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20 15.2A8 8 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Choose appearance">
      <ToggleButtonGroup
        exclusive
        size="small"
        value={preference}
        onChange={changeTheme}
        aria-label="Appearance"
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 999,
          '& .MuiToggleButton-root': {
            border: 0,
            px: 1.25,
            borderRadius: 999,
          },
        }}
      >
        {(Object.keys(labels) as ThemePreference[]).map((value) => (
          <ToggleButton key={value} value={value} aria-label={`${labels[value]} theme`}>
            {labels[value]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Tooltip>
  );
}
