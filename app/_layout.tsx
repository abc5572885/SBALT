import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestNotificationPermission } from '@/services/notifications';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Light': require('../assets/fonts/Inter-Light.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'SourceHanSerifTW-Regular': require('../assets/fonts/SourceHanSerifTW-Regular.otf'),
    'SourceHanSerifTW-Medium': require('../assets/fonts/SourceHanSerifTW-Medium.otf'),
    'SourceHanSerifTW-SemiBold': require('../assets/fonts/SourceHanSerifTW-SemiBold.otf'),
    'SourceHanSerifTW-Bold': require('../assets/fonts/SourceHanSerifTW-Bold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      if (fontError) {
        console.warn('Font loading error:', fontError);
      }
      // Request notification permission on first launch
      requestNotificationPermission();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Slot />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
