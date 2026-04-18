import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { autoExpireEvents, getOpenEvents, getRegistrationCounts, getUserStats, getMyRegisteredEvents } from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { getSportConfig } from '@/constants/sports';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedSport } = useAppStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [events, setEvents] = React.useState<Event[]>([]);
  const [myNextEvent, setMyNextEvent] = React.useState<Event | null>(null);
  const [regCounts, setRegCounts] = React.useState<Record<string, number>>({});
  const [stats, setStats] = React.useState({ organized: 0, joined: 0 });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(false);
      await autoExpireEvents();
      const data = await getOpenEvents();
      setEvents(data);
      if (data.length > 0) {
        const counts = await getRegistrationCounts(data.map((e) => e.id));
        setRegCounts(counts);
      }
      // Load user stats and next event
      if (user) {
        getUserStats(user.id).then(setStats).catch(() => {});
        getMyRegisteredEvents(user.id).then((myEvents) => {
          const upcoming = myEvents.find((e) => new Date(e.scheduled_at) > new Date());
          setMyNextEvent(upcoming || null);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('載入資料失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter by selected sport
  const filteredEvents = selectedSport === 'all'
    ? events
    : events.filter((e) => e.sport_type === selectedSport);

  // Split events: upcoming (within 7 days) vs later
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = filteredEvents.filter((e) => new Date(e.scheduled_at) <= weekLater);
  const laterEvents = filteredEvents.filter((e) => new Date(e.scheduled_at) > weekLater);
  const sportLabel = selectedSport !== 'all' ? getSportConfig(selectedSport).label : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
            載入中...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.lg }}>
            載入失敗，請檢查網路連線
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); loadData(); }}
          >
            <ThemedText style={{ color: colors.primaryText, fontWeight: '600' }}>重試</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const renderEventCard = (evt: Event) => {
    const sportLabel = SPORT_OPTIONS.find((s) => s.key === evt.sport_type)?.label || '';
    const count = regCounts[evt.id] || 0;

    return (
      <TouchableOpacity
        key={evt.id}
        style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
        onPress={() => router.push({ pathname: '/event/detail', params: { eventId: evt.id } })}
        activeOpacity={0.7}
      >
        {evt.image_url && (
          <Image source={{ uri: evt.image_url }} style={styles.cardImage} />
        )}
        <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardTitle} numberOfLines={1}>{evt.title}</ThemedText>
          {sportLabel && (
            <View style={[styles.sportTag, { backgroundColor: colors.primary + '12' }]}>
              <ThemedText type="label" style={{ color: colors.primary }}>{sportLabel}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardInfoItem}>
            <IconSymbol name="calendar" size={13} color={colors.textSecondary} />
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              {formatDateChinese(new Date(evt.scheduled_at))}
            </ThemedText>
          </View>
          <View style={styles.cardInfoItem}>
            <IconSymbol name="location.fill" size={13} color={colors.textSecondary} />
            <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {evt.location}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardInfoItem}>
            <IconSymbol name="person.fill" size={13} color={colors.primary} />
            <ThemedText type="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              {count}/{evt.quota}
            </ThemedText>
          </View>
          {evt.fee > 0 && (
            <ThemedText type="label" style={{ color: colors.text }}>
              NT$ {evt.fee}
            </ThemedText>
          )}
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.greetingSection}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
            <Text style={[styles.brandTitle, { color: colors.text }]}>SBALT</Text>
            {sportLabel && (
              <ThemedText type="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                {sportLabel}
              </ThemedText>
            )}
          </View>
          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNumber, { color: colors.primary }]}>{stats.organized}</Text>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>主辦</ThemedText>
            </View>
            <View style={[styles.miniStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatNumber, { color: colors.primary }]}>{stats.joined}</Text>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>參加</ThemedText>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Next event reminder */}
          {myNextEvent && (
            <TouchableOpacity
              style={[styles.nextEventCard, { backgroundColor: colors.primary }, Shadows.md]}
              onPress={() => router.push({ pathname: '/event/detail', params: { eventId: myNextEvent.id } })}
              activeOpacity={0.8}
            >
              <ThemedText type="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>下一場活動</ThemedText>
              <Text style={styles.nextEventTitle}>{myNextEvent.title}</Text>
              <Text style={styles.nextEventInfo}>
                {formatDateChinese(new Date(myNextEvent.scheduled_at))} · {myNextEvent.location}
              </Text>
            </TouchableOpacity>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/event/new')}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={20} color={colors.primary} />
              <ThemedText style={styles.actionText}>舉辦活動</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/event/venues')}
              activeOpacity={0.7}
            >
              <IconSymbol name="location.fill" size={20} color={colors.primary} />
              <ThemedText style={styles.actionText}>附近場地</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Sport tools */}
          {(selectedSport === 'basketball' || selectedSport === 'volleyball') && (
            <TouchableOpacity
              style={[styles.toolCard, { backgroundColor: selectedSport === 'basketball' ? '#E87A2A' : '#2563EB' }, Shadows.md]}
              onPress={() => router.push({ pathname: '/sport/board', params: { type: selectedSport } })}
              activeOpacity={0.8}
            >
              <View style={styles.toolCardContent}>
                <Text style={styles.toolCardTitle}>
                  {selectedSport === 'basketball' ? '戰術板' : '戰術板 / 輪轉表'}
                </Text>
                <Text style={styles.toolCardSubtitle}>
                  {selectedSport === 'basketball' ? '安排進攻防守站位' : '追蹤輪轉與戰術位置'}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}

          {/* Upcoming events (within 7 days) */}
          {upcomingEvents.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                即將開始
              </ThemedText>
              {upcomingEvents.slice(0, 5).map(renderEventCard)}
            </View>
          )}

          {/* Later events */}
          {laterEvents.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                更多活動
              </ThemedText>
              {laterEvents.slice(0, 5).map(renderEventCard)}
            </View>
          )}

          {/* Empty state */}
          {events.length === 0 && (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.md }}>
                目前尚無公開活動
              </ThemedText>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={() => router.push('/event/new')}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={16} color={colors.primaryText} />
                <ThemedText style={{ color: colors.primaryText, fontWeight: '600' }}>建立活動</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
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
    paddingHorizontal: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  miniStatDivider: {
    width: 1,
    height: 24,
  },
  nextEventCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  nextEventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextEventInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
  },
  toolCardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  toolCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  toolCardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  // Event card
  eventCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sportTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  cardInfo: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Empty
  emptyContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
});
