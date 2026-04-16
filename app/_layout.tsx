import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Slot, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (url: string) => {
      const parsed = Linking.parse(url);
      // Handle sbalt://open?event={id}
      const eventId = parsed.queryParams?.event as string | undefined;
      if (eventId) {
        router.push({ pathname: '/(tabs)/event/detail', params: { eventId } });
      }
    };

    // Handle URL that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Handle URLs while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}

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
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DeepLinkHandler />
        <Slot />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
