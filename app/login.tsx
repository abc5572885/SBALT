/**
 * Login Screen
 * Handles Google OAuth authentication via Supabase
 * Uses PKCE flow for secure authentication
 */

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import * as AuthSession from 'expo-auth-session';
import { Redirect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(false);
  const loggingRef = useRef(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'sbalt',
    path: 'oauth',
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && loggingRef.current) {
        loggingRef.current = false;
        setLoading(false);
        router.replace('/(tabs)');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      loggingRef.current = true;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error || !data?.url) {
        Alert.alert('登入失敗', error?.message || 'No OAuth URL');
        setLoading(false);
        loggingRef.current = false;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
        showInRecents: true,
        preferEphemeralSession: true,
      });

      if (result.type !== 'success' || !result.url) {
        setLoading(false);
        loggingRef.current = false;
        return;
      }

      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const oauthError = url.searchParams.get('error');

      if (oauthError) {
        Alert.alert('登入失敗', `Auth error: ${oauthError}`);
        setLoading(false);
        loggingRef.current = false;
        return;
      }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          Alert.alert('登入失敗', `Exchange error: ${exErr.message}`);
          setLoading(false);
          loggingRef.current = false;
          return;
        }
      } else {
        Alert.alert('登入失敗', 'Missing authorization code');
        setLoading(false);
        loggingRef.current = false;
      }
    } catch (e: any) {
      Alert.alert('登入失敗', e?.message || 'Unknown error');
      setLoading(false);
      loggingRef.current = false;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>SBALT</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          運動社交，從這裡開始
        </Text>
      </View>

      <View style={styles.bottom}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              處理中...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.text }, Shadows.md]}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <Text style={[styles.loginButtonText, { color: colors.background }]}>
              Sign in with Google
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  bottom: {
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  loginButton: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
