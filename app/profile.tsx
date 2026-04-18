import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VerifiedBadge, VerifiedLabel } from '@/components/VerifiedBadge';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { pickAndUploadAvatar } from '@/services/avatar';
import { getUserStats } from '@/services/database';
import { getProfile, AccountType } from '@/services/profile';
import { useAppStore } from '@/store/useAppStore';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stats, setStats] = useState({ organized: 0, joined: 0 });
  const [accountType, setAccountType] = useState<AccountType>('regular');
  const [officialTitle, setOfficialTitle] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const { setUser } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      if (user) {
        getUserStats(user.id).then(setStats).catch(() => {});
        getProfile(user.id).then((p) => {
          if (p) {
            setAccountType(p.account_type);
            setOfficialTitle(p.official_title);
            setUsername(p.username);
          }
        }).catch(() => {});
      }
    }, [user])
  );

  const handleAvatarPress = async () => {
    if (!user || uploading) return;
    try {
      setUploading(true);
      const url = await pickAndUploadAvatar(user.id);
      if (url) {
        // Add cache buster to force image reload
        const avatarUrl = url + '?t=' + Date.now();
        setUser({ ...user, avatarUrl });
        setAvatarUrl(avatarUrl);
      }
    } catch (error) {
      console.error('頭像上傳失敗:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) {
    return (
      <ScreenLayout>
        <PageHeader title="個人資料" showBack={true} />
        <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
          載入中...
        </ThemedText>
      </ScreenLayout>
    );
  }

  const menuItems = [
    { icon: 'pencil' as const, label: '我建立的活動', onPress: () => router.push('/event/my-events') },
    { icon: 'calendar' as const, label: '我報名的活動', onPress: () => router.push('/event/joined') },
    { icon: 'gearshape.fill' as const, label: '設定', onPress: () => router.push('/(tabs)/settings') },
  ];

  return (
    <ScreenLayout scrollable>
      {/* Avatar & Info */}
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7} style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.text }]}>
              <Text style={[styles.avatarText, { color: colors.background }]}>
                {(user.displayName || user.email)?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {uploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
            <IconSymbol name="pencil" size={10} color="#FFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/edit-profile')} activeOpacity={0.7} style={styles.nameRow}>
          <Text style={[styles.displayName, { color: colors.text }]}>
            {user.displayName || '未設定'}
          </Text>
          <VerifiedBadge accountType={accountType} />
        </TouchableOpacity>
        {accountType === 'official' && officialTitle && (
          <VerifiedLabel accountType={accountType} officialTitle={officialTitle} />
        )}
        {username && (
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            @{username}
          </ThemedText>
        )}
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
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
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
