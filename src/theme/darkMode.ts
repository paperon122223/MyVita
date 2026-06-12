export interface AppTheme {
  colors: {
    background: string;
    text: string;
    border: string;
    card: string;
  };
  isDark: boolean;
}

export const createTheme = (isDark: boolean): AppTheme => ({
  colors: {
    background: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#1F2937',
    border: isDark ? '#374151' : '#E5E7EB',
    card: isDark ? '#374151' : '#F3F4F6',
  },
  isDark,
});

export const lightTheme = createTheme(false);
export const darkTheme = createTheme(true);
