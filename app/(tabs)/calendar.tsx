import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getOpenEvents } from '@/services/database';
import { Event } from '@/types/database';
import { formatTime } from '@/utils/dateFormat';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function generateDateRange(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = -7; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [allEvents, setAllEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dateRange = React.useMemo(() => generateDateRange(), []);
  const todayRef = React.useRef<ScrollView>(null);

  const todayIndex = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateRange.findIndex((d) => isSameDay(d, today));
  }, [dateRange]);

  React.useEffect(() => {
    loadEvents();
  }, []);

  React.useEffect(() => {
    if (!loading && todayRef.current && todayIndex >= 0) {
      const offset = Math.max(0, todayIndex * 56 - 120);
      todayRef.current.scrollTo({ x: offset, animated: false });
    }
  }, [loading, todayIndex]);

  const loadEvents = async () => {
    try {
      setError(false);
      const data = await getOpenEvents();
      setAllEvents(data);
    } catch (err) {
      console.error('載入活動失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = React.useMemo(() => {
    return allEvents.filter((evt) => {
      const evtDate = new Date(evt.scheduled_at);
      return isSameDay(evtDate, selectedDate);
    });
  }, [allEvents, selectedDate]);

  // Count events per date for dot indicator
  const eventDates = React.useMemo(() => {
    const dates = new Set<string>();
    allEvents.forEach((evt) => {
      const d = new Date(evt.scheduled_at);
      dates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return dates;
  }, [allEvents]);

  const hasEventsOnDate = (date: Date) => {
    return eventDates.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  };

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>日曆</Text>

        {/* Date strip */}
        <View style={styles.dateStripWrapper}>
          <ScrollView
            ref={todayRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
          >
            {dateRange.map((date, index) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);
              const hasEvents = hasEventsOnDate(date);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateCell,
                    { backgroundColor: colors.surface },
                    isSelected && { backgroundColor: colors.text },
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[
                      styles.dateWeekday,
                      { color: colors.textSecondary },
                      isSelected && { color: colors.background },
                      isToday && !isSelected && { color: colors.primary },
                    ]}
                  >
                    {WEEKDAY_LABELS[date.getDay()]}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.dateDay,
                      isSelected && { color: colors.background },
                      isToday && !isSelected && { color: colors.primary },
                    ]}
                  >
                    {date.getDate()}
                  </ThemedText>
                  {hasEvents && (
                    <View
                      style={[
                        styles.eventDot,
                        { backgroundColor: isSelected ? colors.background : colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected date label */}
        <ThemedText type="caption" style={[styles.dateLabel, { color: colors.textSecondary }]}>
          {selectedDate.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {isSameDay(selectedDate, today) ? '（今天）' : ''}
        </ThemedText>

        {/* Events for selected date */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {filteredEvents.length > 0 ? (
            <View style={styles.list}>
              {filteredEvents.map((evt) => {
                const sportLabel = SPORT_OPTIONS.find((s) => s.key === evt.sport_type)?.label || '';
                return (
                  <TouchableOpacity
                    key={evt.id}
                    style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                    onPress={() => router.push({ pathname: '/event/detail', params: { eventId: evt.id } })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.timeColumn}>
                      <ThemedText style={[styles.timeText, { color: colors.primary }]}>
                        {formatTime(new Date(evt.scheduled_at))}
                      </ThemedText>
                    </View>
                    <View style={[styles.timeDivider, { backgroundColor: colors.primary }]} />
                    <View style={styles.eventInfo}>
                      <View style={styles.eventTitleRow}>
                        <ThemedText style={styles.eventTitle} numberOfLines={1}>{evt.title}</ThemedText>
                        {sportLabel && (
                          <View style={[styles.sportTag, { backgroundColor: colors.primary + '12' }]}>
                            <ThemedText type="label" style={{ color: colors.primary }}>{sportLabel}</ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={styles.eventMeta}>
                        <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
                        <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          {evt.location}
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                當日尚無活動
              </ThemedText>
            </View>
          )}
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
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dateStripWrapper: {
    marginBottom: Spacing.md,
  },
  dateStrip: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dateCell: {
    width: 48,
    height: 68,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateWeekday: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  dateLabel: {
    marginBottom: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  timeDivider: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 1.5,
  },
  eventInfo: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  sportTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
});
