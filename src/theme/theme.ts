import { createTheme, type PaletteMode } from '@mui/material/styles';

export const brand = {
  navy: '#07192d',
  navyDeep: '#03101f',
  ink: '#0b1f35',
  muted: '#5f6f83',
  canvas: '#f7f5ef',
  paper: '#ffffff',
  cream: '#fff5d6',
  line: '#e5decb',
  gold: '#f3c643',
  goldDeep: '#d99e16',
  blue: '#07192d',
  blueDeep: '#03101f',
  amber: '#f4b22b',
  red: '#dc2626',
} as const;

export function createInstaScoreTheme(mode: PaletteMode) {
  const dark = mode === 'dark';
  const controlBlue = dark ? brand.cream : brand.blue;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: brand.gold,
        dark: brand.goldDeep,
        contrastText: brand.navy,
      },
      secondary: {
        main: dark ? '#f8fafc' : brand.navy,
        contrastText: '#ffffff',
      },
      background: {
        default: dark ? brand.navyDeep : brand.canvas,
        paper: dark ? brand.navy : brand.paper,
      },
      text: {
        primary: dark ? brand.cream : brand.ink,
        secondary: dark ? '#d6deea' : brand.muted,
      },
      divider: dark ? '#24364d' : brand.line,
      error: { main: brand.red },
      warning: { main: brand.amber },
      success: { main: '#16a34a' },
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      h1: { fontWeight: 900, letterSpacing: '-0.04em' },
      h2: { fontWeight: 850, letterSpacing: '-0.03em' },
      h3: { fontWeight: 800, letterSpacing: '-0.02em' },
      button: { fontWeight: 800, textTransform: 'none' },
    },
    components: {
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${dark ? '#273449' : brand.line}`,
            borderRadius: 0,
            boxShadow: dark
              ? '0 18px 48px rgba(0, 0, 0, 0.24)'
              : '0 16px 40px rgba(7, 25, 45, 0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: 42,
            borderRadius: 0,
            '&.Mui-disabled': { opacity: 0.58 },
          },
          containedPrimary: {
            color: brand.navy,
            backgroundColor: brand.gold,
            '&:hover': { color: brand.navy, backgroundColor: brand.goldDeep },
            '&.Mui-disabled': { color: brand.navy, backgroundColor: brand.gold },
          },
          outlinedPrimary: {
            color: controlBlue,
            borderColor: controlBlue,
            backgroundColor: 'transparent',
            '&:hover': {
              color: dark ? '#ffffff' : brand.blueDeep,
              borderColor: dark ? '#ffffff' : brand.blueDeep,
              backgroundColor: dark ? 'rgba(255,245,214,.08)' : 'rgba(7,25,45,.07)',
            },
          },
          textPrimary: {
            color: controlBlue,
            '&:hover': {
              color: dark ? '#ffffff' : brand.blueDeep,
              backgroundColor: dark ? 'rgba(255,245,214,.08)' : 'rgba(7,25,45,.07)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 0, fontWeight: 800 },
          colorPrimary: { color: brand.navy, backgroundColor: brand.gold },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            color: controlBlue,
            '&.Mui-selected': {
              color: '#ffffff',
              backgroundColor: brand.blue,
              '&:hover': { backgroundColor: brand.blueDeep },
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  });
}
