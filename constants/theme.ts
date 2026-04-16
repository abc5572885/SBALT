/**
 * SBALT Design System
 * Modern minimal style — black/white/gray + single accent color
 */

import { Platform } from 'react-native';

// ─── Colors ───────────────────────────────────────────────

export const Colors = {
  light: {
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    background: '#FFFFFF',
    surface: '#FAFAFA',
    tint: '#2563EB',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#1A1A1A',
    // UI Colors
    primary: '#2563EB',
    primaryText: '#FFFFFF',
    secondary: '#F3F4F6',
    border: '#E5E7EB',
    error: '#DC2626',
    errorBackground: '#FEF2F2',
    card: '#FAFAFA',
    // Status Colors
    statusSuccess: '#16A34A',
    statusSecondary: '#6B7280',
    // Control Colors
    disabled: '#D1D5DB',
    placeholder: '#9CA3AF',
    overlay: 'rgba(0, 0, 0, 0.4)',
    switchTrackOff: '#E5E7EB',
  },
  dark: {
    text: '#F5F5F5',
    textSecondary: '#9CA3AF',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    tint: '#3B82F6',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#F5F5F5',
    // UI Colors
    primary: '#3B82F6',
    primaryText: '#FFFFFF',
    secondary: '#1F2937',
    border: '#27272A',
    error: '#EF4444',
    errorBackground: '#1C1111',
    card: '#1A1A1A',
    // Status Colors
    statusSuccess: '#22C55E',
    statusSecondary: '#9CA3AF',
    // Control Colors
    disabled: '#4B5563',
    placeholder: '#6B7280',
    overlay: 'rgba(0, 0, 0, 0.6)',
    switchTrackOff: '#374151',
  },
};

// ─── Shadows ──────────────────────────────────────────────

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  }),
};

// ─── Spacing ──────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// ─── Border Radius ────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
