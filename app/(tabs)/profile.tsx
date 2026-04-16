import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) {
    return (
      <ScreenLayout>
        <PageHeader title="個人資料" showBack={false} />
        <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
          載入中...
        </ThemedText>
      </ScreenLayout>
    );
  }

  const menuItems = [
    { icon: 'calendar' as const, label: '我報名的活動', onPress: () => router.push('/(tabs)/event/joined') },
    { icon: 'pencil' as const, label: '我建立的活動', onPress: () => router.push('/(tabs)/event/my-events') },
    { icon: 'plus' as const, label: '建立活動', onPress: () => router.push('/(tabs)/event/new') },
    { icon: 'gearshape.fill' as const, label: '設定', onPress: () => router.push('/(tabs)/settings') },
  ];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="個人資料" showBack={false} />

      {/* Avatar & Info */}
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(user.displayName || user.email)?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <ThemedText style={styles.displayName}>
          {user.displayName || '未設定'}
        </ThemedText>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          {user.email}
        </ThemedText>
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              { backgroundColor: colors.surface, borderColor: colors.border },
              Shadows.sm,
            ]}
            onPress={item.onPress}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <IconSymbol name={item.icon} size={18} color={colors.textSecondary} />
              <ThemedText style={styles.menuText}>{item.label}</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: colors.surface, borderColor: colors.border, marginTop: Spacing.lg },
            Shadows.sm,
          ]}
          onPress={handleLogout}
          activeOpacity={0.6}
        >
          <View style={styles.menuLeft}>
            <IconSymbol name="arrow.right.square" size={18} color={colors.error} />
            <ThemedText style={[styles.menuText, { color: colors.error }]}>登出</ThemedText>
          </View>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  menuSection: {
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
