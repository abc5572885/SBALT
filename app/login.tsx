/**
 * Login Screen
 * Handles Google OAuth authentication via Supabase
 * Uses PKCE flow for secure authentication
 * Single-path implementation: only navigate on SIGNED_IN event to avoid race conditions
 */

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as AuthSession from 'expo-auth-session';
import { Redirect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const loggingRef = useRef(false);

  // Generate redirect URI based on current environment
  // Native App: sbalt://oauth
  // Expo Go: exp://[IP]:[port]/--/oauth
  // Web: https://localhost:19006/oauth or https://yourwebsite.com/oauth
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

  // Redirect to home if already authenticated
  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
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

      // Get OAuth provider URL (PKCE flow)
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
        Alert.alert('Login failed', error?.message || 'No OAuth URL');
        setLoading(false);
        loggingRef.current = false;
        return;
      }

      // Open auth session and wait for callback
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
        showInRecents: true,
        preferEphemeralSession: true,
      });

      if (result.type !== 'success' || !result.url) {
        setLoading(false);
        loggingRef.current = false;
        return;
      }

      // Only handle PKCE code, avoid mixing with implicit flow
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const oauthError = url.searchParams.get('error');

      if (oauthError) {
        Alert.alert('Login failed', `Auth error: ${oauthError}`);
        setLoading(false);
        loggingRef.current = false;
        return;
      }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          Alert.alert('Login failed', `Exchange error: ${exErr.message}`);
          setLoading(false);
          loggingRef.current = false;
          return;
        }
        // Navigation is handled by onAuthStateChange SIGNED_IN event
      } else {
        Alert.alert('Login failed', 'Missing authorization code');
        setLoading(false);
        loggingRef.current = false;
      }
    } catch (e: any) {
      Alert.alert('Login failed', e?.message || 'Unknown error');
      setLoading(false);
      loggingRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SBALT</Text>
      <Text style={styles.subtitle}>Sign in with Google</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing…</Text>
        </View>
      ) : (
        <Button title="Sign in with Google" onPress={handleGoogleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
});
