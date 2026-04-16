import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyRegisteredEvents } from '@/services/database';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function JoinedEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) loadEvents();
    }, [user])
  );

  const loadEvents = async () => {
    if (!user) return;
    try {
      const data = await getMyRegisteredEvents(user.id);
      setEvents(data);
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="我報名的活動" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <PageHeader title="我報名的活動" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} />
        }
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={{ color: colors.textSecondary }}>
              您尚未報名任何活動
            </ThemedText>
            <TouchableOpacity
              style={[styles.browseBtn, { backgroundColor: colors.primary }, Shadows.sm]}
              onPress={() => router.push('/(tabs)/scores')}
              activeOpacity={0.7}
            >
              <ThemedText style={{ color: colors.primaryText, fontWeight: '600', fontSize: 15 }}>
                瀏覽活動
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {events.map((evt) => {
              const sportLabel = SPORT_OPTIONS.find((s) => s.key === evt.sport_type)?.label || '';
              const isPast = new Date(evt.scheduled_at) < new Date();

              return (
                <TouchableOpacity
                  key={evt.id}
                  style={[
                    styles.eventCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    Shadows.sm,
                    isPast && { opacity: 0.6 },
                  ]}
                  onPress={() => router.push({ pathname: '/(tabs)/event/detail', params: { eventId: evt.id } })}
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
                    <View style={styles.infoRow}>
                      <IconSymbol name="calendar" size={13} color={colors.textSecondary} />
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                        {formatDateChinese(new Date(evt.scheduled_at))}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <IconSymbol name="location.fill" size={13} color={colors.textSecondary} />
                      <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        {evt.location}
                      </ThemedText>
                    </View>
                  </View>
                  {isPast && (
                    <ThemedText type="label" style={{ color: colors.textSecondary }}>已結束</ThemedText>
                  )}
                </TouchableOpacity>
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
  emptyContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  browseBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
  },
  list: {
    gap: Spacing.md,
  },
  eventCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
