import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { autoExpireEvents, getOpenEvents, getRegistrationCounts } from '@/services/database';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [events, setEvents] = React.useState<Event[]>([]);
  const [regCounts, setRegCounts] = React.useState<Record<string, number>>({});
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

  // Split events: upcoming (within 7 days) vs later
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = events.filter((e) => new Date(e.scheduled_at) <= weekLater);
  const laterEvents = events.filter((e) => new Date(e.scheduled_at) > weekLater);

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
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Brand header */}
        <Text style={[styles.brandTitle, { color: colors.text }]}>SBALT</Text>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
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
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginBottom: Spacing.xl,
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
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  // Event card
  eventCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
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
