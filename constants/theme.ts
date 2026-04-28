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
    statusWarning: '#F59E0B',
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
    statusWarning: '#F59E0B',
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

// ─── Typography scale ────────────────────────────────────
// Six fixed type sizes for the whole app. New screens MUST pick from
// here rather than picking ad-hoc fontSize values; existing code can
// migrate gradually.
//
// Mental model:
//   display    僅用於最大數字（比分、計時器、單一 hero KPI）
//   title      頁面主標題、彈窗主標題
//   headline   分區標題、卡片粗體標題
//   body       正文、輸入欄位、次要 CTA
//   caption    註解、metadata（時間、人數）
//   label      tab / chip / overline 短標、強調 letter spacing

export const Type = {
  display: { fontSize: 32, fontWeight: '900' as const, letterSpacing: -1 },
  title:   { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5 },
  headline:{ fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3 },
  body:    { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  label:   { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
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

// ─── Touch hit slop ──────────────────────────────────────
// Shared hitSlop values so icon-only buttons across the app expand to a
// consistent touch target. Default is 12px on each side, the minimum we
// want for any tappable icon.

export const HitSlop = {
  /** Standard 12px expansion — use for header / card icons. */
  default: { top: 12, bottom: 12, left: 12, right: 12 },
  /** 16px expansion — use for tighter clusters where each target is small. */
  large: { top: 16, bottom: 16, left: 16, right: 16 },
};
