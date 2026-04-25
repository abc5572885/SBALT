import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  AppNotification,
  getMyNotifications,
  getNotificationRoute,
  markAllAsRead,
  markAsRead,
  NotificationType,
} from '@/services/appNotifications';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TYPE_ICON: Record<NotificationType, any> = {
  team_invite: 'envelope.fill',
  team_invite_accepted: 'person.fill',
  team_invite_declined: 'person.fill',
  team_member_left: 'person.fill',
  booking_created: 'calendar',
  booking_confirmed: 'calendar',
  booking_rejected: 'calendar',
  tournament_registered: 'star.fill',
  event_comment: 'message.fill',
  event_starting_soon: 'bolt.fill',
  official_approved: 'star.fill',
  achievement_unlocked: 'bolt.fill',
  check_in_tagged: 'sportscourt.fill',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-TW');
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyNotifications(user.id);
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleTap = async (n: AppNotification) => {
    if (!n.read_at) {
      markAsRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
    }
    const route = getNotificationRoute(n);
    if (route) {
      router.push(route as any);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <ScreenLayout>
      <PageHeader
        title="通知"
        rightContent={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
              style={[styles.markAllBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.markAll, { color: colors.text }]}>全部已讀</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="envelope.fill" size={40} color={colors.disabled} />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
            還沒有通知
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
        >
          <View style={{ gap: Spacing.sm }}>
            {notifications.map((n) => {
              const unread = !n.read_at;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    Shadows.sm,
                    unread && { borderColor: colors.primary, borderLeftWidth: 3 },
                  ]}
                  onPress={() => handleTap(n)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: unread ? colors.primary + '15' : colors.secondary }]}>
                    <IconSymbol
                      name={TYPE_ICON[n.type] || 'envelope.fill'}
                      size={18}
                      color={unread ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]}>{n.title}</Text>
                    {n.body && (
                      <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {n.body}
                      </ThemedText>
                    )}
                    <ThemedText type="caption" style={{ color: colors.disabled, marginTop: 4 }}>
                      {formatTime(n.created_at)}
                    </ThemedText>
                  </View>
                  {unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  markAll: { fontSize: 12, fontWeight: '600' },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '600' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
