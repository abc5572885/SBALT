import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getOpenEvents, getRegistrationCounts } from '@/services/database';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FILTER_OPTIONS = [
  { key: 'all', label: '全部' },
  ...SPORT_OPTIONS.filter((s) => s.key !== 'other'),
];

export default function EventsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [regCounts, setRegCounts] = React.useState<Record<string, number>>({});
  const [error, setError] = React.useState(false);
  const [filter, setFilter] = React.useState('all');

  React.useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setError(false);
      const data = await getOpenEvents();
      setEvents(data);
      if (data.length > 0) {
        const counts = await getRegistrationCounts(data.map((e) => e.id));
        setRegCounts(counts);
      }
    } catch (err) {
      console.error('載入活動失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const filteredEvents = filter === 'all'
    ? events
    : events.filter((e) => e.sport_type === filter);

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
            onPress={() => { setLoading(true); loadEvents(); }}
          >
            <ThemedText style={{ color: colors.primaryText, fontWeight: '600' }}>重試</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <PageHeader title="活動" showBack={false} />

        {/* Sport filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  isActive && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => setFilter(opt.key)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    isActive && { color: colors.background },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Event list */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredEvents.length > 0 ? (
            <View style={styles.list}>
              {filteredEvents.map((evt) => {
                const sportLabel = SPORT_OPTIONS.find((s) => s.key === evt.sport_type)?.label || '';
                return (
                  <TouchableOpacity
                    key={evt.id}
                    style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                    onPress={() => router.push({ pathname: '/(tabs)/event/detail', params: { eventId: evt.id } })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.cardTitleRow}>
                        <ThemedText style={styles.cardTitle} numberOfLines={1}>{evt.title}</ThemedText>
                        {sportLabel && (
                          <View style={[styles.sportTag, { backgroundColor: colors.primary + '12' }]}>
                            <ThemedText type="label" style={{ color: colors.primary }}>{sportLabel}</ThemedText>
                          </View>
                        )}
                      </View>
                      {evt.description && (
                        <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          {evt.description}
                        </ThemedText>
                      )}
                    </View>

                    <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.cardBottom}>
                      <View style={styles.cardInfoItem}>
                        <IconSymbol name="calendar" size={14} color={colors.textSecondary} />
                        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                          {formatDateChinese(new Date(evt.scheduled_at))}
                        </ThemedText>
                      </View>
                      <View style={styles.cardInfoItem}>
                        <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                        <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          {evt.location}
                        </ThemedText>
                      </View>
                      <View style={styles.cardInfoItem}>
                        <IconSymbol name="person.fill" size={14} color={colors.primary} />
                        <ThemedText type="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                          {regCounts[evt.id] || 0}/{evt.quota}
                        </ThemedText>
                      </View>
                      {evt.fee > 0 && (
                        <ThemedText type="label" style={{ color: colors.primary }}>
                          NT$ {evt.fee}
                        </ThemedText>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                {filter === 'all' ? '目前尚無公開活動' : '此類型尚無活動'}
              </ThemedText>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={() => router.push('/(tabs)/event/new')}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={16} color={colors.primaryText} />
                <ThemedText style={{ color: colors.primaryText, fontWeight: '600', fontSize: 15 }}>
                  建立活動
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
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
  // Filter
  filterScroll: {
    flexGrow: 0,
    marginBottom: Spacing.lg,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // List
  list: {
    gap: Spacing.md,
  },
  eventCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardTop: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardTitleRow: {
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
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    flexWrap: 'wrap',
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  // Empty
  emptyContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.lg,
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
