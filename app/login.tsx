import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  // 產生預設 redirectUri（避免型別不相容的 useProxy 參數）
  const redirectUri = makeRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '1021986912007-0e5479usldes9e8fsoq9lhjosgt1eimf.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    redirectUri,
  });

  React.useEffect(() => {
    console.log('Generated redirect URI:', redirectUri);
    if (response?.type === 'success') {
      router.replace('/profile');
    } else if (response?.type === 'error') {
      console.log('Google auth error:', response);
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>歡迎來到 Vivelog</Text>
      <Text style={styles.subtitle}>請使用 Google 帳號登入</Text>
      <Button
        title="使用 Google 登入"
        disabled={!request}
        onPress={() => promptAsync()}
      />
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
});
