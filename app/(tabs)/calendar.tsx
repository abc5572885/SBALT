import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllGames } from '@/services/scoreApi';
import { Game } from '@/types/database';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** Generate an array of dates: 7 days before today through 14 days after */
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [allGames, setAllGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dateRange = React.useMemo(() => generateDateRange(), []);
  const todayRef = React.useRef<ScrollView>(null);

  // Find index of today for initial scroll
  const todayIndex = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateRange.findIndex((d) => isSameDay(d, today));
  }, [dateRange]);

  React.useEffect(() => {
    loadGames();
  }, []);

  // Scroll to today on mount
  React.useEffect(() => {
    if (!loading && todayRef.current && todayIndex >= 0) {
      // Each date cell is 56px wide + 8px gap
      const offset = Math.max(0, todayIndex * 64 - 120);
      todayRef.current.scrollTo({ x: offset, animated: false });
    }
  }, [loading, todayIndex]);

  const loadGames = async () => {
    try {
      setError(false);
      const games = await getAllGames(1, 50);
      setAllGames(games);
    } catch (err) {
      console.error('載入比賽失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter games for selected date
  const filteredGames = React.useMemo(() => {
    return allGames.filter((game) => {
      const gameDate = new Date(game.scheduled_at);
      return isSameDay(gameDate, selectedDate);
    });
  }, [allGames, selectedDate]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>載入中...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>載入失敗，請檢查網路連線</ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setLoading(true);
              loadGames();
            }}
          >
            <ThemedText style={[styles.retryText, { color: colors.primaryText }]}>
              重試
            </ThemedText>
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
        <PageHeader title="賽事日曆" showBack={false} />

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
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateCell,
                    { backgroundColor: colors.card },
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[
                      styles.dateWeekday,
                      isSelected && { color: colors.primaryText },
                      isToday && !isSelected && { color: colors.primary },
                    ]}
                  >
                    {WEEKDAY_LABELS[date.getDay()]}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.dateDay,
                      isSelected && { color: colors.primaryText },
                      isToday && !isSelected && { color: colors.primary },
                    ]}
                  >
                    {date.getDate()}
                  </ThemedText>
                  {isToday && (
                    <View
                      style={[
                        styles.todayDot,
                        { backgroundColor: isSelected ? colors.primaryText : colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected date label */}
        <ThemedText style={styles.subtitle}>
          {selectedDate.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {isSameDay(selectedDate, today) ? '（今天）' : ''}
        </ThemedText>

        {/* Game list */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {filteredGames.length > 0 ? (
            <View style={styles.list}>
              {filteredGames.map((item) => (
                <ScoreCard key={item.id} game={item} />
              ))}
            </View>
          ) : (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>當日尚無比賽</ThemedText>
            </ThemedView>
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
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: 12,
  },
  // Date strip
  dateStripWrapper: {
    marginBottom: 12,
  },
  dateStrip: {
    gap: 8,
    paddingVertical: 4,
  },
  dateCell: {
    width: 56,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateWeekday: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  // Content
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.5,
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
