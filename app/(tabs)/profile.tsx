import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // This screen is protected, so user should always be available
  // But we add a safety check just in case
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">個人資料</ThemedText>
          <ThemedText style={styles.subtitle}>載入中...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          個人資料
        </ThemedText>

      <View style={styles.profileSection}>
        <ThemedText style={styles.label}>顯示名稱</ThemedText>
        <ThemedText style={styles.value}>
          {user.displayName || '未設定'}
        </ThemedText>

        <ThemedText style={styles.label}>電子郵件</ThemedText>
        <ThemedText style={styles.value}>{user.email}</ThemedText>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings')}
        >
          <ThemedText style={styles.menuText}>⚙️ 設定</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/event/new')}
        >
          <ThemedText style={styles.menuText}>➕ 建立活動</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <ThemedText style={[styles.menuText, styles.logoutText]}>
            登出
          </ThemedText>
        </TouchableOpacity>
      </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 24,
    opacity: 0.7,
  },
  profileSection: {
    marginBottom: 32,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  value: {
    fontSize: 16,
    marginBottom: 16,
  },
  menuSection: {
    gap: 12,
  },
  menuItem: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  menuText: {
    fontSize: 16,
  },
  logoutText: {
    color: '#FF3B30',
  },
});

