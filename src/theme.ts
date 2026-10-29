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
