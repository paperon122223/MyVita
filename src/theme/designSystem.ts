// ================================================================
// designSystem.ts — Sistema de diseño MyVita
// "Premium Wellness" (Material 3) — rediseño accesible para mayores.
// Azul profundo + verde vitalidad, tipografía grande (mín. 18px),
// tiles de íconos en contenedores suaves, esquinas muy redondeadas.
// ================================================================

import { TextStyle, ViewStyle } from 'react-native';

export const DesignSystem = {
  colors: {
    // Paleta principal Material 3
    primary: '#006096', // azul profundo
    primaryDark: '#004a75',
    secondary: '#006e2a', // verde vitalidad
    secondaryLight: '#3ce36a',
    accent: '#007abc',

    // Gradiente firma "Vitality" (azul → verde)
    gradientStart: '#006096',
    gradientEnd: '#006e2a',

    // Estados
    success: '#006e2a',
    warning: '#8c4c00', // naranja terciario
    error: '#ba1a1a',
    danger: '#ba1a1a',
    info: '#006096',

    // Superficies (claro)
    surface: '#f8f9ff', // fondo base (blanco azulado)
    surfaceContainerLow: '#eff4ff',
    surfaceContainer: '#e5eeff',
    surfaceContainerHigh: '#dce9ff',
    card: '#ffffff',
    text: '#0b1c30', // navy profundo
    muted: '#3f4851',
    subtle: '#707882', // outline
    border: '#bfc7d2', // outline-variant

    // Superficies (oscuro)
    surfaceDark: '#0f172a',
    surfaceContainerDark: '#1b2536',
    cardDark: '#1e293b',
    textDark: '#eaf1ff',
    mutedDark: '#aeb6c2',
    borderDark: '#3a4350',

    gray: {
      50: '#f8f9ff',
      100: '#eff4ff',
      200: '#dce9ff',
      300: '#bfc7d2',
      400: '#909aa6',
      500: '#707882',
      600: '#4b5563',
      700: '#3f4851',
      800: '#213145',
      900: '#0b1c30',
    },
  },

  // Tiles de íconos: contenedor suave + color fuerte del ícono
  statContainers: {
    blue: { bg: '#dce9ff', fg: '#006096' },
    green: { bg: '#c6f6d5', fg: '#006e2a' },
    orange: { bg: '#ffdcc2', fg: '#8c4c00' },
    red: { bg: '#ffdad6', fg: '#ba1a1a' },
  },

  // Gradientes (cápsula firma + acentos)
  statGradients: {
    adherence: ['#006e2a', '#3ce36a'] as [string, string],
    active: ['#006096', '#007abc'] as [string, string],
    pending: ['#8c4c00', '#b06000'] as [string, string],
    streak: ['#ba1a1a', '#ff5449'] as [string, string],
    signature: ['#006096', '#006e2a'] as [string, string],
  },

  // Tipografía accesible — Poppins, body nunca por debajo de 18px
  typography: {
    displayNum: { fontSize: 44, fontWeight: '800', lineHeight: 52 } as TextStyle,
    heading1: { fontSize: 28, fontWeight: '800', lineHeight: 36 } as TextStyle,
    heading2: { fontSize: 24, fontWeight: '700', lineHeight: 32 } as TextStyle,
    heading3: { fontSize: 20, fontWeight: '700', lineHeight: 28 } as TextStyle,
    subtitle1: { fontSize: 18, fontWeight: '600', lineHeight: 26 } as TextStyle,
    subtitle2: { fontSize: 16, fontWeight: '600', lineHeight: 22 } as TextStyle,
    body1: { fontSize: 18, fontWeight: '400', lineHeight: 28 } as TextStyle,
    body2: { fontSize: 16, fontWeight: '400', lineHeight: 24 } as TextStyle,
    button: { fontSize: 18, fontWeight: '700', lineHeight: 24 } as TextStyle,
    caption: { fontSize: 14, fontWeight: '500', lineHeight: 18 } as TextStyle,
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    } as TextStyle,
  },

  // Familias Poppins por peso (Android necesita la familia exacta)
  fonts: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semibold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
    extrabold: 'Poppins_800ExtraBold',
  },

  // Escala 8px
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Esquinas redondeadas (tarjetas 24, botones/inputs 16, tiles 12)
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Sombras ambientales con tinte azul
  shadows: {
    sm: {
      shadowColor: '#006096',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    } as ViewStyle,
    md: {
      shadowColor: '#006096',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 4,
    } as ViewStyle,
    lg: {
      shadowColor: '#006096',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 9,
    } as ViewStyle,
  },

  // Altura mínima de zona táctil (accesibilidad)
  touchTarget: 48,
} as const;

export default DesignSystem;
