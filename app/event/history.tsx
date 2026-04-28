import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEventScores, getMyRegisteredEvents } from '@/services/database';
import { Event, EventScore } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface EventWithScores extends Event {
  scores: EventScore[];
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [events, setEvents] = useState<EventWithScores[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) loadHistory();
    }, [user])
  );

  const loadHistory = async () => {
    if (!user) return;
    try {
      const myEvents = await getMyRegisteredEvents(user.id);
      // Only past events
      const pastEvents = myEvents.filter((e) => new Date(e.scheduled_at) < new Date());

      // Load scores for each
      const withScores = await Promise.all(
        pastEvents.map(async (evt) => {
          const scores = await getEventScores(evt.id);
          return { ...evt, scores };
        })
      );

      setEvents(withScores);
    } catch (error) {
      console.error('載入歷史失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="歷史戰績" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  // Stats
  const totalGames = events.length;
  const gamesWithScores = events.filter((e) => e.scores.length > 0);

  return (
    <ScreenLayout>
      <PageHeader title="歷史戰績" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{totalGames}</Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>參加場次</ThemedText>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{gamesWithScores.length}</Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>有記分</ThemedText>
          </View>
        </View>

        {/* History list */}
        {events.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="尚無歷史紀錄"
            body="參加活動後會自動出現在這裡"
          />
        ) : (
          <View style={styles.list}>
            {events.map((evt) => {
              const sportLabel = SPORT_OPTIONS.find((s) => s.key === evt.sport_type)?.label || '';
              return (
                <View
                  key={evt.id}
                  style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.cardTitle}>{evt.title}</ThemedText>
                      <View style={styles.cardMeta}>
                        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                          {formatDateChinese(new Date(evt.scheduled_at))}
                        </ThemedText>
                        {sportLabel && (
                          <ThemedText type="caption" style={{ color: colors.primary }}>
                            {sportLabel}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Scores */}
                  {evt.scores.length > 0 ? (
                    <View style={[styles.scoreBox, { borderColor: colors.border }]}>
                      {evt.scores.map((s, i) => (
                        <View key={s.id} style={styles.scoreItem}>
                          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                            {s.label}
                          </ThemedText>
                          <Text style={[
                            styles.scoreNum,
                            { color: i === 0 && s.score >= (evt.scores[1]?.score ?? 0) ? colors.primary : colors.text },
                          ]}>
                            {s.score}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.sm }}>
                      未記分
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  list: {
    gap: Spacing.md,
  },
  historyCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  scoreBox: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scoreItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  emptyContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
