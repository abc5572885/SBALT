import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyRegisteredEvents } from '@/services/database';
import { getMyGroups, getGroupPosts } from '@/services/groups';
import { Event, Group, GroupPost } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
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
import { SafeAreaView } from 'react-native-safe-area-context';

interface FeedItem {
  type: 'post' | 'upcoming';
  id: string;
  timestamp: string;
  // Post fields
  groupName?: string;
  groupId?: string;
  content?: string;
  userId?: string;
  // Event fields
  event?: Event;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) loadFeed();
    }, [user])
  );

  const loadFeed = async () => {
    if (!user) return;
    try {
      const [groups, myEvents] = await Promise.all([
        getMyGroups(user.id),
        getMyRegisteredEvents(user.id),
      ]);

      const items: FeedItem[] = [];

      // Load posts from all groups
      for (const group of groups.slice(0, 5)) {
        const posts = await getGroupPosts(group.id);
        for (const post of posts.slice(0, 3)) {
          items.push({
            type: 'post',
            id: post.id,
            timestamp: post.created_at,
            groupName: group.name,
            groupId: group.id,
            content: post.content,
            userId: post.user_id,
          });
        }
      }

      // Add upcoming events as reminders
      const upcoming = myEvents
        .filter((e) => new Date(e.scheduled_at) > new Date())
        .slice(0, 3);
      for (const evt of upcoming) {
        items.push({
          type: 'upcoming',
          id: `event-${evt.id}`,
          timestamp: evt.scheduled_at,
          event: evt,
        });
      }

      // Sort by timestamp
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeed(items);
    } catch (error) {
      console.error('載入社群失敗:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>社群</Text>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed(); }} />}
        >
          {/* Quick actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/group')}
              activeOpacity={0.7}
            >
              <IconSymbol name="person.fill" size={18} color={colors.primary} />
              <ThemedText style={styles.actionText}>我的群組</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/group/create')}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={18} color={colors.primary} />
              <ThemedText style={styles.actionText}>建立群組</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Feed */}
          {feed.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                加入群組後，這裡會顯示群組公告和活動提醒
              </ThemedText>
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/group')}
                activeOpacity={0.7}
              >
                <ThemedText style={{ color: '#FFF', fontWeight: '600' }}>探索群組</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.feedList}>
              {feed.map((item) => {
                if (item.type === 'post') {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.feedCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                      onPress={() => router.push({ pathname: '/group/[id]', params: { id: item.groupId! } })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.feedHeader}>
                        <ThemedText type="label" style={{ color: colors.primary }}>{item.groupName}</ThemedText>
                        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                          {new Date(item.timestamp).toLocaleDateString('zh-TW')}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.feedContent} numberOfLines={3}>
                        {item.content}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                }

                if (item.type === 'upcoming' && item.event) {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.feedCard, styles.eventReminder, { borderColor: colors.primary + '30', backgroundColor: colors.primary + '08' }, Shadows.sm]}
                      onPress={() => router.push({ pathname: '/event/detail', params: { eventId: item.event!.id } })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.feedHeader}>
                        <ThemedText type="label" style={{ color: colors.primary }}>即將開始</ThemedText>
                      </View>
                      <ThemedText style={styles.feedEventTitle}>{item.event.title}</ThemedText>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                        {formatDateChinese(new Date(item.event.scheduled_at))} · {item.event.location}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                }

                return null;
              })}
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  scrollView: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyCard: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.lg,
  },
  joinBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
  },
  feedList: {
    gap: Spacing.sm,
  },
  feedCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  eventReminder: {},
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  feedEventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});
