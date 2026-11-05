// OnIt colors. Every screen uses these so light and dark mode stay consistent.
import { useColorScheme } from 'react-native';

export const BLUE = '#2563EB';

export type Theme = { bg: string; field: string; text: string; muted: string; line: string };

const THEMES: Record<'light' | 'dark', Theme> = {
  light: { bg: '#F3F6FB', field: '#FFFFFF', text: '#0A1228', muted: '#5B6780', line: '#D3DBE7' },
  dark: { bg: '#0A1228', field: '#121C35', text: '#F3F6FC', muted: '#98A3BA', line: '#2E3C5E' },
};

// Picks light or dark colors based on the phone's setting.
export function useTheme(): Theme {
  return THEMES[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

// Colors for the Home, Jobs and tab screens (the warm palette), light and dark.
export type AppColors = {
  bg: string; surface: string; border: string;
  text: string; textSecondary: string; textMuted: string;
  accent: string; disabled: string;
};

const APP: Record<'light' | 'dark', AppColors> = {
  light: {
    bg: '#FAFAF7', surface: '#FFFFFF', border: '#DAD8D1',
    text: '#111111', textSecondary: '#5E5E5A', textMuted: '#9A9A94',
    accent: '#3B83F6', disabled: '#CFCDC6',
  },
  dark: {
    bg: '#111214', surface: '#1B1C20', border: '#2E3036',
    text: '#F5F5F2', textSecondary: '#A8A8A2', textMuted: '#76766F',
    accent: '#5B9BFF', disabled: '#3A3B40',
  },
};

export function useAppColors(): AppColors {
  return APP[useColorScheme() === 'dark' ? 'dark' : 'light'];
}