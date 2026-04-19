import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { ToastHost } from '@/components/ToastHost';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestNotificationPermission } from '@/services/notifications';

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
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="open" />
        </Stack>
        <ToastHost />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
