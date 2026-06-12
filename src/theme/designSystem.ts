import { TextStyle, ViewStyle } from 'react-native';

export const DesignSystem = {
  colors: {
    primary: '#00A86B',
    secondary: '#FF6B6B',
    accent: '#FFB84D',

    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  typography: {
    heading1: { fontSize: 32, fontWeight: '700', lineHeight: 40 } as TextStyle,
    heading2: { fontSize: 28, fontWeight: '600', lineHeight: 36 } as TextStyle,
    heading3: { fontSize: 24, fontWeight: '600', lineHeight: 32 } as TextStyle,
    subtitle1: { fontSize: 18, fontWeight: '500', lineHeight: 28 } as TextStyle,
    subtitle2: { fontSize: 16, fontWeight: '500', lineHeight: 24 } as TextStyle,
    body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 } as TextStyle,
    body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 } as TextStyle,
    button: { fontSize: 16, fontWeight: '600', lineHeight: 20 } as TextStyle,
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 } as TextStyle,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    } as ViewStyle,
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    } as ViewStyle,
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 5,
    } as ViewStyle,
  },
} as const;
