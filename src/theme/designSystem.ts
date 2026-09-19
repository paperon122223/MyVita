// ================================================================
// designSystem.ts — Sistema de diseño MyVita
// Identidad "medical premium" oscura y futurista: fondo azul noche
// #07111F, tarjetas #111C2B, degradado de marca azul eléctrico →
// verde brillante, radios muy redondeados (18-24px), glow selectivo.
// ================================================================

import { TextStyle, ViewStyle } from 'react-native';

export const DesignSystem = {
  colors: {
    // Paleta principal de marca — azul rey + verde agua
    primary: '#007BFF', // azul eléctrico
    primaryDark: '#174EA6',
    primaryText: '#1557B0',
    primaryTextDark: '#93C5FD',
    secondary: '#2BD84A', // verde brillante
    secondaryLight: '#6EE884',
    accent: '#38BDF8', // azul cielo
    royalBlue: '#1E3FE0', // azul rey — base de tarjetas/botones "firma"
    aquaGreen: '#2FE0C2', // verde agua/claro — cierre del gradiente "firma"

    // Gradiente firma "Vitality" (azul rey → verde agua)
    gradientStart: '#1E3FE0',
    gradientEnd: '#2FE0C2',

    // Estados
    success: '#2BD84A',
    warning: '#F59E0B',
    error: '#E53935',
    danger: '#E53935',
    info: '#007BFF',

    // Superficies (claro)
    surface: '#F5F8FF', // fondo base (blanco azulado)
    surfaceContainerLow: '#EAF1FE',
    surfaceContainer: '#DCEAFE',
    surfaceContainerHigh: '#CFE2FD',
    card: '#ffffff',
    text: '#0B1526', // navy profundo
    muted: '#48566B',
    subtle: '#7A8AA0', // outline
    border: '#D7E1EF', // outline-variant

    // Superficies (oscuro) — dark UI premium, tipo app médica
    surfaceDark: '#07111F',
    surfaceContainerDark: '#0C1826',
    cardDark: '#111C2B',
    textDark: '#F2F6FF',
    mutedDark: '#B0BED2',
    borderDark: 'rgba(255,255,255,0.08)',

    gray: {
      50: '#F5F8FF',
      100: '#EAF1FE',
      200: '#DCEAFE',
      300: '#D7E1EF',
      400: '#9AAAC2',
      500: '#7A8AA0',
      600: '#48566B',
      700: '#334156',
      800: '#1B2740',
      900: '#0B1526',
    },
  },

  // Tiles de íconos: contenedor suave + color fuerte del ícono
  statContainers: {
    blue: { bg: '#DCEEFF', fg: '#007BFF' },
    green: { bg: '#D9FBE3', fg: '#1FAE4A' },
    orange: { bg: '#FEEBD0', fg: '#F59E0B' },
    red: { bg: '#FBDEDC', fg: '#E53935' },
  },

  // Fondo de las tarjetas de estadística (StatCard): degradado casi negro → color,
  // muy sutil — solo un tinte, no un color plano.
  statCardBg: {
    blue: ['#05070C', '#0A1F3D'] as [string, string],
    green: ['#050906', '#0A2A17'] as [string, string],
    orange: ['#0A0805', '#2E1B08'] as [string, string],
    red: ['#0A0505', '#2E0A0A'] as [string, string],
  },

  // Gradientes (cápsula firma + acentos)
  statGradients: {
    adherence: ['#2BD84A', '#6EE884'] as [string, string],
    active: ['#007BFF', '#4FA8FF'] as [string, string],
    pending: ['#F59E0B', '#FBBF24'] as [string, string],
    streak: ['#E53935', '#FF6B5E'] as [string, string],
    // Gradiente "firma": azul rey → verde agua — todas las tarjetas/botones principales
    signature: ['#1947B8', '#087666'] as [string, string],
    brand3: ['#2FE0C2', '#38BDF8', '#1E3FE0'] as [string, string, string],
    sos: ['#FF3B30', '#D32F2F'] as [string, string],
    sosDisabled: ['#9CA3AF', '#6B7280'] as [string, string],
    // Fondo general de pantalla en modo oscuro: azul noche → verde oscuro
    appBackground: ['#050B14', '#03170F'] as [string, string],
  },

  // Gradientes propios de cada apartado (tiles, encabezados, FAB, botones de esa sección)
  sectionGradients: {
    medicinas: ['#1947B8', '#087666'] as [string, string],
    alarmas: ['#1947B8', '#087666'] as [string, string],
    chat: ['#1947B8', '#087666'] as [string, string],
    sos: ['#F97316', '#DC2626'] as [string, string], // naranja → rojo
    diario: ['#1947B8', '#087666'] as [string, string], // igual que el principal
    mapa: ['#1947B8', '#087666'] as [string, string],
    cuidador: ['#1947B8', '#087666'] as [string, string],
    configuracion: ['#1947B8', '#087666'] as [string, string],
  },

  // Tipografía accesible — Poppins, body nunca por debajo de 18px
  typography: {
    displayNum: { fontSize: 44, fontFamily: 'Poppins_800ExtraBold', lineHeight: 52 } as TextStyle,
    heading1: { fontSize: 28, fontFamily: 'Poppins_800ExtraBold', lineHeight: 36 } as TextStyle,
    heading2: { fontSize: 24, fontFamily: 'Poppins_700Bold', lineHeight: 32 } as TextStyle,
    heading3: { fontSize: 20, fontFamily: 'Poppins_700Bold', lineHeight: 28 } as TextStyle,
    subtitle1: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', lineHeight: 26 } as TextStyle,
    subtitle2: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', lineHeight: 22 } as TextStyle,
    body1: { fontSize: 18, fontFamily: 'Poppins_400Regular', lineHeight: 28 } as TextStyle,
    body2: { fontSize: 16, fontFamily: 'Poppins_400Regular', lineHeight: 24 } as TextStyle,
    button: { fontSize: 18, fontFamily: 'Poppins_700Bold', lineHeight: 24 } as TextStyle,
    caption: { fontSize: 14, fontFamily: 'Poppins_500Medium', lineHeight: 18 } as TextStyle,
    sectionTitle: {
      fontSize: 14,
      fontFamily: 'Poppins_700Bold',
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

  // Esquinas muy redondeadas (18-24px en tarjetas, píldora en botones)
  borderRadius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    xxl: 24,
    full: 9999,
  },

  // Sombras suaves (nunca negras) + glow selectivo (SOS, botones, indicadores, robot IA)
  shadows: {
    sm: {
      shadowColor: '#007BFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    } as ViewStyle,
    md: {
      shadowColor: '#007BFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 4,
    } as ViewStyle,
    lg: {
      shadowColor: '#007BFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 28,
      elevation: 9,
    } as ViewStyle,
    glow: {
      shadowColor: '#FF3B30',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 10,
    } as ViewStyle,
    glowBlue: {
      shadowColor: '#007BFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    } as ViewStyle,
    glowGreen: {
      shadowColor: '#2BD84A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    } as ViewStyle,
  },

  // Altura mínima de zona táctil (accesibilidad)
  touchTarget: 56,
} as const;

export default DesignSystem;
