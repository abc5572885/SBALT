import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { ToastHost } from '@/components/ToastHost';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestNotificationPermission } from '@/services/notifications';

// Dev simulator without code signing: expo-notifications fails Keychain access at startup.
// Non-fatal but throws an unhandled rejection. Suppress so the red overlay doesn't block UI.
LogBox.ignoreLogs([
  /getRegistrationInfoAsync/,
  /Keychain access failed/,
  /要求的授權並非現用中/,
]);

const SUPPRESS_PATTERNS = [
  'getRegistrationInfoAsync',
  'Keychain access failed',
  '要求的授權並非現用中',
];

const _origConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map((a) => (a?.message ?? String(a))).join(' ');
  if (SUPPRESS_PATTERNS.some((p) => msg.includes(p))) return;
  _origConsoleError(...args);
};

// Hermes / RN promise rejection tracker
const Hermes: any = (global as any).HermesInternal;
if (Hermes?.enablePromiseRejectionTracker) {
  Hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (_id: number, error: any) => {
      const msg = String(error?.message ?? error);
      if (SUPPRESS_PATTERNS.some((p) => msg.includes(p))) return;
      _origConsoleError('Unhandled promise rejection:', error);
    },
  });
}

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
    requestNotificationPermission();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="event" />
          <Stack.Screen name="group" />
          <Stack.Screen name="sport" />
          <Stack.Screen name="promotion" />
          <Stack.Screen name="user" />
          <Stack.Screen name="tournament" />
          <Stack.Screen name="venue" />
          <Stack.Screen name="login" />
          <Stack.Screen name="blocked-users" />
          <Stack.Screen name="my-bookings" />
          <Stack.Screen name="my-teams" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="check-in" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="open" />
        </Stack>
        <ToastHost />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
