import { createTheme } from '@mui/material/styles';

const FONT_SIZE_MAP = { SMALL: 13, MEDIUM: 14, LARGE: 16 };

const resolveMode = (themeMode) => {
  if (themeMode === 'DARK') return 'dark';
  if (themeMode === 'LIGHT') return 'light';
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const buildPalette = (mode, highContrast) => {
  if (!highContrast) {
    return {
      mode,
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' },
      background: mode === 'dark'
        ? { default: '#0f172a', paper: '#1e293b' }
        : { default: '#f5f7fa', paper: '#ffffff' },
    };
  }

  return mode === 'dark'
    ? {
        mode,
        primary: { main: '#66b2ff' },
        secondary: { main: '#e0b3ff' },
        background: { default: '#000000', paper: '#0a0a0a' },
        text: { primary: '#ffffff', secondary: '#f0f0f0' },
        divider: '#ffffff',
      }
    : {
        mode,
        primary: { main: '#0033cc' },
        secondary: { main: '#6a00a3' },
        background: { default: '#ffffff', paper: '#ffffff' },
        text: { primary: '#000000', secondary: '#1a1a1a' },
        divider: '#000000',
      };
};

export const buildTheme = (settings = {}) => {
  const mode = resolveMode(settings.themeMode);
  const fontSize = FONT_SIZE_MAP[settings.fontSize] ?? FONT_SIZE_MAP.MEDIUM;

  const theme = createTheme({
    palette: buildPalette(mode, settings.highContrast),
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize,
      htmlFontSize: fontSize === 14 ? 16 : Math.round((fontSize / 14) * 16),
    },
    components: {
      MuiCard: { styleOverrides: { root: { borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' } } },
      MuiButton: { styleOverrides: { root: { borderRadius: '8px', textTransform: 'none', fontWeight: 600 } } },
    },
  });

  if (settings.reducedMotion) {
    theme.transitions.duration = Object.fromEntries(
      Object.keys(theme.transitions.duration).map((key) => [key, 0])
    );
  }

  return theme;
};
