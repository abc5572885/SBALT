/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // UI Colors
    primary: '#007AFF',
    primaryText: '#FFFFFF',
    secondary: '#F5F5F5',
    border: '#F0F0F0',
    error: '#FF3B30',
    card: '#F5F5F5',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // UI Colors
    primary: '#007AFF',
    primaryText: '#FFFFFF',
    secondary: '#2C2C2E',
    border: '#3A3A3C',
    error: '#FF3B30',
    card: '#2C2C2E',
  },
};

// Legacy font constants (deprecated - use constants/fonts.ts instead)
// Kept for backward compatibility
export const Fonts = {
  primary: 'Inter-Regular',
  primaryBold: 'Inter-Bold',
  primarySemiBold: 'Inter-SemiBold',
  primaryMedium: 'Inter-Medium',
  primaryLight: 'Inter-Light',
  chinese: 'SourceHanSerif-Regular',
  chineseBold: 'SourceHanSerif-Bold',
  chineseMedium: 'SourceHanSerif-Medium',
  combined: 'Inter-Regular',
  sans: Platform.select({
    ios: 'system-ui',
    default: 'normal',
    web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  }) || 'normal',
  serif: Platform.select({
    ios: 'ui-serif',
    default: 'serif',
    web: "Georgia, 'Times New Roman', serif",
  }) || 'serif',
  rounded: Platform.select({
    ios: 'ui-rounded',
    default: 'normal',
    web: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
  }) || 'normal',
  mono: Platform.select({
    ios: 'ui-monospace',
    default: 'monospace',
    web: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  }) || 'monospace',
};
