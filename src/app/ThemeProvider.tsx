import { CssBaseline, ThemeProvider as MuiThemeProvider, useMediaQuery } from '@mui/material';
import { useEffect, useMemo, type PropsWithChildren } from 'react';

import { useThemeStore } from '../state/themeStore';
import { createInstaScoreTheme } from '../theme/theme';

export function ThemeProvider({ children }: PropsWithChildren) {
  const preference = useThemeStore((state) => state.preference);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const mode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  const theme = useMemo(() => createInstaScoreTheme(mode), [mode]);

  useEffect(() => {
    document.documentElement.dataset.instascoreTheme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}
