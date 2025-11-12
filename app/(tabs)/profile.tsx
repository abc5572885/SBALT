import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) {
    return (
      <ScreenLayout>
        <PageHeader title="個人資料" showBack={false} />
        <ThemedText style={styles.subtitle}>載入中...</ThemedText>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable>
      <PageHeader title="個人資料" showBack={false} />
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
          style={[
            styles.menuItem,
            colorScheme === 'dark' ? styles.menuItemDark : styles.menuItemLight,
          ]}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.menuText}>⚙️ 設定</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            colorScheme === 'dark' ? styles.menuItemDark : styles.menuItemLight,
          ]}
          onPress={() => router.push('/(tabs)/event/my-events')}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.menuText}>📅 我的活動</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            colorScheme === 'dark' ? styles.menuItemDark : styles.menuItemLight,
          ]}
          onPress={() => router.push('/(tabs)/event/new')}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.menuText}>➕ 建立活動</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            colorScheme === 'dark' ? styles.menuItemDark : styles.menuItemLight,
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.menuText, styles.logoutText]}>
            登出
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 12,
  },
  menuItemLight: {
    backgroundColor: Colors.light.card,
  },
  menuItemDark: {
    backgroundColor: Colors.dark.card,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutText: {
    color: Colors.light.error,
  },
});

