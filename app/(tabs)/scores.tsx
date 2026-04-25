import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyRegisteredEvents } from '@/services/database';
import { getMyGroups, getGroupPosts } from '@/services/groups';
import { Event } from '@/types/database';
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

const HCARD_W = 260;

interface PostItem {
  id: string;
  timestamp: string;
  groupName: string;
  groupId: string;
  content: string;
  userId: string;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
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

      const collectedPosts: PostItem[] = [];
      for (const group of groups.slice(0, 5)) {
        const groupPosts = await getGroupPosts(group.id);
        for (const post of groupPosts.slice(0, 3)) {
          collectedPosts.push({
            id: post.id,
            timestamp: post.created_at,
            groupName: group.name,
            groupId: group.id,
            content: post.content,
            userId: post.user_id,
          });
        }
      }
      collectedPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPosts(collectedPosts);

      const upcoming = myEvents
        .filter((e) => new Date(e.scheduled_at) > new Date())
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 6);
      setUpcomingEvents(upcoming);
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

  const isEmpty = upcomingEvents.length === 0 && posts.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>社群</Text>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed(); }} />}
          contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        >
          {/* Quick actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/group')}
              activeOpacity={0.7}
            >
              <IconSymbol name="person.2.fill" size={18} color={colors.text} />
              <ThemedText style={styles.actionText}>我的群組</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/group/create')}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={18} color={colors.text} />
              <ThemedText style={styles.actionText}>建立群組</ThemedText>
            </TouchableOpacity>
          </View>

          {isEmpty ? (
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
            <>
              {/* Upcoming events — horizontal featured */}
              {upcomingEvents.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>即將開始</Text>
                      <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                        {upcomingEvents.length} 場
                      </Text>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hScrollContent}
                  >
                    {upcomingEvents.map((evt) => {
                      const diffMs = new Date(evt.scheduled_at).getTime() - Date.now();
                      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                      const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                      const countdown = days > 0 ? `${days}天${hours}小時後` : `${hours}小時後`;
                      return (
                        <TouchableOpacity
                          key={evt.id}
                          style={[styles.eventCard, { backgroundColor: colors.text }, Shadows.md]}
                          onPress={() => router.push({ pathname: '/event/detail', params: { eventId: evt.id } })}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.eventCountdown, { color: colors.background, opacity: 0.55 }]}>
                            {countdown}
                          </Text>
                          <Text style={[styles.eventTitle, { color: colors.background }]} numberOfLines={2}>
                            {evt.title}
                          </Text>
                          <View style={styles.eventMeta}>
                            <View style={styles.eventMetaItem}>
                              <IconSymbol name="calendar" size={12} color={colors.background} />
                              <Text style={[styles.eventMetaText, { color: colors.background, opacity: 0.7 }]}>
                                {formatDateChinese(new Date(evt.scheduled_at))}
                              </Text>
                            </View>
                            <View style={styles.eventMetaItem}>
                              <IconSymbol name="location.fill" size={12} color={colors.background} />
                              <Text style={[styles.eventMetaText, { color: colors.background, opacity: 0.7 }]} numberOfLines={1}>
                                {evt.location}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Group posts — vertical list */}
              {posts.length > 0 && (
                <View style={[styles.section, { paddingHorizontal: Spacing.lg }]}>
                  <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>群組動態</Text>
                    </View>
                  </View>
                  <View style={styles.postList}>
                    {posts.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                        onPress={() => router.push({ pathname: '/group/[id]', params: { id: item.groupId } })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.postHeader}>
                          <ThemedText type="label" style={{ color: colors.text }}>{item.groupName}</ThemedText>
                          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                            {new Date(item.timestamp).toLocaleDateString('zh-TW')}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.postContent} numberOfLines={3}>
                          {item.content}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
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
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  hScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  // Event card (dark, featured)
  eventCard: {
    width: HCARD_W,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  eventCountdown: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginVertical: Spacing.xs,
  },
  eventMeta: {
    gap: 4,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eventMetaText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  // Post list
  postList: {
    gap: Spacing.sm,
  },
  postCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postContent: {
    fontSize: 14,
    lineHeight: 21,
  },
  // Empty state
  emptyCard: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  joinBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
  },
});
