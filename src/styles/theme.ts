// src/styles/theme.ts - SISTEMA DE TEMAS PARA REACT NATIVE (CORREGIDO)
import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ========================================
// COLORES EXACTOS DEL DISEÑO ORIGINAL
// ========================================
export const colors = {
  // Colores principales
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe', 
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Color principal NORA
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e'
  },

  // Colores de fondo dark theme
  background: {
    primary: '#0a0a0a',    // Fondo principal muy oscuro
    secondary: '#111111',  // Fondo secundario
    tertiary: '#1a1a1a',   // Fondo de cards
    quaternary: '#222222', // Fondo de inputs
    overlay: 'rgba(0, 0, 0, 0.8)', // Overlay para modales
    glass: 'rgba(255, 255, 255, 0.05)' // Efecto glassmorphism
  },

  // Textos
  text: {
    primary: '#ffffff',     // Texto principal
    secondary: '#a1a1aa',   // Texto secundario
    tertiary: '#71717a',    // Texto terciario
    muted: '#52525b',       // Texto deshabilitado
    accent: '#0ea5e9',      // Texto de acento
    success: '#22c55e',     // Texto de éxito
    warning: '#f59e0b',     // Texto de advertencia
    error: '#ef4444'        // Texto de error
  },

  // Bordes
  border: {
    primary: '#27272a',     // Borde principal
    secondary: '#3f3f46',   // Borde secundario
    focus: '#0ea5e9',       // Borde en focus
    error: '#ef4444'        // Borde de error
  },

  // Estados
  success: '#22c55e',
  warning: '#f59e0b', 
  error: '#ef4444',
  info: '#0ea5e9',

  // Gradientes (corregido como arrays de strings)
  gradients: {
    primary: ['#0ea5e9', '#3b82f6'] as const,
    secondary: ['#1f2937', '#374151'] as const,
    accent: ['#f59e0b', '#f97316'] as const,
    nora: ['#0ea5e9', '#8b5cf6', '#ec4899'] as const // Gradiente característico de NORA
  },

  // Transparencias
  opacity: {
    5: 'rgba(255, 255, 255, 0.05)',
    10: 'rgba(255, 255, 255, 0.1)',
    20: 'rgba(255, 255, 255, 0.2)',
    30: 'rgba(255, 255, 255, 0.3)',
    50: 'rgba(255, 255, 255, 0.5)',
    70: 'rgba(255, 255, 255, 0.7)',
    90: 'rgba(255, 255, 255, 0.9)'
  }
};

// ========================================
// TIPOGRAFÍAS
// ========================================
export const typography = {
  // Tamaños de fuente
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48
  },

  // Pesos de fuente
  fontWeight: {
    thin: '100' as const,
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const
  },

  // Alturas de línea
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },

  // Familias de fuente (adaptadas para React Native)
  fontFamily: {
    system: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System'
    }),
    mono: Platform.select({
      ios: 'Courier New',
      android: 'monospace', 
      default: 'Courier New'
    })
  }
};

// ========================================
// ESPACIADO
// ========================================
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
  40: 160,
  48: 192,
  56: 224,
  64: 256
};

// ========================================
// BORDES Y RADIOS
// ========================================
export const borderRadius = {
  none: 0,
  sm: 2,
  base: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999
};

export const borderWidth = {
  0: 0,
  1: 1,
  2: 2,
  4: 4,
  8: 8
};

// ========================================
// SOMBRAS (adaptadas para React Native)
// ========================================
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  base: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 15
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25
  },
  glow: {
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10
  }
};

// ========================================
// LAYOUT Y DIMENSIONES
// ========================================
export const layout = {
  window: {
    width,
    height
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280
  },
  headerHeight: 60,
  tabBarHeight: 80,
  bottomSafeArea: Platform.select({
    ios: 34,
    android: 0,
    default: 0
  })
};

// ========================================
// ANIMACIONES
// ========================================
export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out'
  }
};

// ========================================
// COMPONENTES PRE-ESTILIZADOS
// ========================================
export const componentStyles = {
  // Estilo base para containers
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },

  // Estilo para cards
  card: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    ...shadows.md
  },

  // Estilo para glassmorphism
  glass: {
    backgroundColor: colors.background.glass,
    borderWidth: borderWidth[1],
    borderColor: colors.border.primary
  },

  // Estilo para inputs
  input: {
    backgroundColor: colors.background.quaternary,
    borderWidth: borderWidth[1],
    borderColor: colors.border.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.system
  },

  // Estilo para botones
  button: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...shadows.sm
  },

  // Estilo para texto de títulos
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.system
  },

  // Estilo para texto de subtítulos
  subtitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.system
  },

  // Estilo para texto del cuerpo
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    color: colors.text.primary,
    lineHeight: typography.lineHeight.normal,
    fontFamily: typography.fontFamily.system
  },

  // Estilo para texto pequeño
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.system
  }
};

// ========================================
// UTILIDADES DE TEMA
// ========================================
export const themeUtils = {
  // Generar color con opacidad
  withOpacity: (color: string, opacity: number) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);  
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },

  // Verificar si es tablet
  isTablet: () => width >= layout.breakpoints.md,

  // Verificar si es landscape
  isLandscape: () => width > height,

  // Obtener padding horizontal responsivo
  getHorizontalPadding: () => {
    if (width >= layout.breakpoints.lg) return spacing[8];
    if (width >= layout.breakpoints.md) return spacing[6];
    return spacing[4];
  },

  // Obtener tamaño de fuente responsivo
  getResponsiveFontSize: (base: number) => {
    const scale = width / 375; // Escala basada en iPhone X
    return Math.max(base * scale, base * 0.8); // Mínimo 80% del tamaño base
  }
};

// ========================================
// TEMA COMPLETO
// ========================================
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  borderWidth,
  shadows,
  layout,
  animations,
  componentStyles,
  utils: themeUtils
};

export default theme;