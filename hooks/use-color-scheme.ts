import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

/**
 * Custom useColorScheme that respects the user's theme preference in Settings.
 * - 'light' or 'dark': use that value directly
 * - 'auto': follow system setting
 */
export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useRNColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);

  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode;
  }

  return systemScheme ?? 'light';
}
