// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 1/20 — Project Foundation, Dependencies, and Theme Setup
// File: src/theme.js
// Generated: 2026-06-24

// ============================================================
// J.A.R.V.I.S. IRON MAN THEME — Color Palette & Design Tokens
// ============================================================

export const Colors = {
  // Primary Palette
  primary: '#00D4FF',
  primaryDark: '#00A8CC',
  primaryLight: '#66E5FF',

  // Background Palette
  background: '#0A0E27',
  backgroundDark: '#050817',
  backgroundLight: '#12183A',
  backgroundCard: '#141B3D',

  // Surface Colors
  surface: '#1A2040',
  surfaceElevated: '#222A50',
  surfacePressed: '#2A335E',

  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textMuted: '#64748B',
  textAccent: '#00D4FF',

  // Status Colors
  success: '#00E676',
  warning: '#FFD600',
  error: '#FF1744',
  info: '#2979FF',

  // Border & Divider
  border: 'rgba(0, 212, 255, 0.15)',
  divider: 'rgba(255, 255, 255, 0.08)',

  // Glow Effects
  glowPrimary: 'rgba(0, 212, 255, 0.3)',
  glowSuccess: 'rgba(0, 230, 118, 0.3)',
  glowError: 'rgba(255, 23, 68, 0.3)',

  // Overlay
  overlay: 'rgba(5, 8, 23, 0.85)',
  overlayLight: 'rgba(5, 8, 23, 0.5)',
};

export const Typography = {
  fontFamily: 'Roboto',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
    '5xl': 40,
  },
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    bold: '700',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
};
