import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VerifiedBadge, VerifiedLabel } from '@/components/VerifiedBadge';
import { FontAwesome5 } from '@expo/vector-icons';
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
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stats, setStats] = useState({ organized: 0, joined: 0 });
  const [accountType, setAccountType] = useState<AccountType>('regular');
  const [officialTitle, setOfficialTitle] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);
  const [facebookUrl, setFacebookUrl] = useState<string | null>(null);
  const [lineId, setLineId] = useState<string | null>(null);
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
            setInstagramUrl(p.instagram_url);
            setFacebookUrl(p.facebook_url);
            setLineId(p.line_id);
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
        <PageHeader title="個人資料" showBack={false} />
        <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
          載入中...
        </ThemedText>
      </ScreenLayout>
    );
  }

  const menuItems: { icon: any; label: string; onPress: () => void; badge?: number }[] = [
    { icon: 'person.fill' as const, label: '我的隊伍', onPress: () => router.push('/my-teams') },
    { icon: 'calendar' as const, label: '我的預約', onPress: () => router.push('/my-bookings') },
    { icon: 'pencil' as const, label: '編輯個人資料', onPress: () => router.push('/edit-profile') },
    { icon: 'bolt.fill' as const, label: '成就', onPress: () => router.push('/event/achievements') },
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
        <TouchableOpacity onPress={() => router.push('/edit-profile')} activeOpacity={0.7} style={styles.nameRow}>
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

        {(instagramUrl || facebookUrl || lineId) && (
          <View style={styles.socialRow}>
            {instagramUrl && (
              <TouchableOpacity
                onPress={() => {
                  const url = instagramUrl.startsWith('http') ? instagramUrl : `https://instagram.com/${instagramUrl.replace(/^@/, '')}`;
                  Linking.openURL(url).catch(() => {});
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="instagram" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {facebookUrl && (
              <TouchableOpacity
                onPress={() => {
                  const url = facebookUrl.startsWith('http') ? facebookUrl : `https://facebook.com/${facebookUrl}`;
                  Linking.openURL(url).catch(() => {});
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="facebook" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {lineId && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://line.me/ti/p/~${lineId}`).catch(() => {})}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="line" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
          onPress={() => router.push('/event/my-events')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {stats.organized}
          </Text>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            主辦活動
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
          onPress={() => router.push('/event/joined')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {stats.joined}
          </Text>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            參加活動
          </ThemedText>
        </TouchableOpacity>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              {item.badge && item.badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
              <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
            </View>
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
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
