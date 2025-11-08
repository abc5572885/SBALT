/**
 * Supabase Client Configuration
 * Optimized for React Native with cross-platform support (iOS, Android, Web)
 * Follows Supabase official best practices for React Native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Get Supabase configuration from app.json extra or environment variables
// Priority: app.json extra > EXPO_PUBLIC_* environment variables
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key not configured. Please set in app.json or .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage only on native platforms (iOS/Android)
    // Web platform uses default storage mechanism
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    // Enable URL detection only on Web platform
    // React Native handles deep links manually in login.tsx
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'sbalt-app',
    },
  },
});

// Test Supabase connection in development environment
if (__DEV__ && supabaseUrl && supabaseAnonKey) {
  supabase.auth.getSession().catch((error) => {
    console.warn('⚠️ Supabase connection test failed:', error.message);
  });
}
