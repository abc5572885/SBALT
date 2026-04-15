/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


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
    errorBackground: '#FFE5E5',
    card: '#F5F5F5',
    // Status Colors
    statusSuccess: '#28A745',
    statusSecondary: '#6C757D',
    // Control Colors
    disabled: '#CCC',
    placeholder: '#999',
    overlay: 'rgba(0, 0, 0, 0.5)',
    switchTrackOff: '#E5E5EA',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // UI Colors
    primary: '#0A84FF',
    primaryText: '#FFFFFF',
    secondary: '#2C2C2E',
    border: '#3A3A3C',
    error: '#FF453A',
    errorBackground: '#3A1A1A',
    card: '#2C2C2E',
    // Status Colors
    statusSuccess: '#30D158',
    statusSecondary: '#8E8E93',
    // Control Colors
    disabled: '#555',
    placeholder: '#6C6C70',
    overlay: 'rgba(0, 0, 0, 0.7)',
    switchTrackOff: '#3A3A3C',
  },
};
