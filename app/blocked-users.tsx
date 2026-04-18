import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBlockedUsers, unblockUser } from '@/services/moderation';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface BlockedRow {
  blocked_id: string;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getBlockedUsers(user.id)
      .then((data) => setRows(data as any))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUnblock = (row: BlockedRow) => {
    if (!user) return;
    const label = row.profiles?.display_name || row.profiles?.username || '此用戶';
    Alert.alert('解除封鎖', `確定要解除對 ${label} 的封鎖嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '解除',
        onPress: async () => {
          try {
            await unblockUser(user.id, row.blocked_id);
            setRows((prev) => prev.filter((r) => r.blocked_id !== row.blocked_id));
          } catch (e: any) {
            Alert.alert('失敗', e.message || '請稍後再試');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="封鎖的用戶" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (rows.length === 0) {
    return (
      <ScreenLayout>
        <PageHeader title="封鎖的用戶" />
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            目前沒有封鎖的用戶
          </ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable>
      <PageHeader title="封鎖的用戶" />
      <View style={styles.list}>
        {rows.map((row) => {
          const label = row.profiles?.display_name
            || (row.profiles?.username ? `@${row.profiles.username}` : `用戶 ${row.blocked_id.slice(0, 8)}`);
          return (
            <View
              key={row.blocked_id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
            >
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => router.push(`/user/${row.blocked_id}`)}
                activeOpacity={0.6}
              >
                {row.profiles?.avatar_url ? (
                  <Image source={{ uri: row.profiles.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.text }]}>
                    <Text style={[styles.avatarText, { color: colors.background }]}>
                      {label[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {label}
                  </Text>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {new Date(row.created_at).toLocaleDateString('zh-TW')} 封鎖
                  </ThemedText>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unblockBtn, { borderColor: colors.border }]}
                onPress={() => handleUnblock(row)}
                activeOpacity={0.7}
              >
                <Text style={[styles.unblockText, { color: colors.text }]}>解除</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: Spacing.xxl }} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  list: {
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  userRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  unblockBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
