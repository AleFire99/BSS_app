export const COLOR_MAP: Record<string, string> = {
  Red:    '#e53935',
  Blue:   '#1e88e5',
  Green:  '#43a047',
  Yellow: '#fdd835',
  Purple: '#8e24aa',
  White:  '#eeeeee',
};

export const RARITY_COLOR: Record<string, string> = {
  X:  '#ff6f00',
  R:  '#c62828',
  UC: '#1565c0',
  C:  '#424242',
};

export const darkTheme = {
  bg:         '#121212',
  surface:    '#1e1e1e',
  border:     '#333333',
  text:       '#f5f5f5',
  textMuted:  '#9e9e9e',
  accent:     '#f9a825',
};

export const lightTheme = {
  bg:         '#e8e8e8',
  surface:    '#f2f2f2',
  border:     '#c8c8c8',
  text:       '#1a1a1a',
  textMuted:  '#5e5e5e',
  accent:     '#d4860a',
};

export type ThemeType = typeof darkTheme;

// Legacy export — used by components not yet migrated; prefer useAppSettings().theme
export const theme = darkTheme;
