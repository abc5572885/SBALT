import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteEvent, getEvents } from '@/services/database';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MyEventsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) loadEvents();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadEvents();
    }, [user])
  );

  const loadEvents = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const myEvents = await getEvents({ organizerId: user.id, excludeInstances: true });
      setEvents(myEvents);
    } catch (error) {
      console.error('載入活動失敗:', error);
      Alert.alert('錯誤', '無法載入活動列表');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleDelete = (event: Event) => {
    Alert.alert(
      '刪除活動',
      `確定要刪除「${event.title}」嗎？此操作無法復原。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              Alert.alert('成功', '活動已刪除');
              loadEvents();
            } catch (error: any) {
              console.error('刪除活動失敗:', error);
              Alert.alert('錯誤', error.message || '刪除活動失敗');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (event: Event) => {
    router.push(`/(tabs)/event/${event.id}`);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return '開放報名';
      case 'closed': return '已截止';
      case 'cancelled': return '已取消';
      case 'finished': return '已結束';
      default: return '草稿';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.statusSuccess;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  if (authLoading || loading) {
    return (
      <ScreenLayout>
        <PageHeader title="我的活動" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
            載入中...
          </ThemedText>
        </ThemedView>
      </ScreenLayout>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <ScreenLayout scrollable>
      <PageHeader title="我的活動" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.lg }}>
              您尚未建立任何活動
            </ThemedText>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }, Shadows.sm]}
              onPress={() => router.push('/(tabs)/event/new')}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={16} color={colors.primaryText} />
              <ThemedText style={{ color: colors.primaryText, fontWeight: '600', fontSize: 15 }}>
                建立第一個活動
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event) => (
              <View
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              >
                {/* Header */}
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      {formatDateChinese(new Date(event.scheduled_at))}
                    </ThemedText>
                    <View style={styles.locationRow}>
                      <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
                      <ThemedText type="caption" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                        {event.location}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + '15' }]}>
                    <ThemedText type="label" style={{ color: getStatusColor(event.status) }}>
                      {getStatusLabel(event.status)}
                    </ThemedText>
                  </View>
                </View>

                {/* Description */}
                {event.description && (
                  <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={2}>
                    {event.description}
                  </ThemedText>
                )}

                {/* Footer */}
                <View style={styles.eventFooter}>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {event.quota} 人上限 · NT$ {event.fee}
                  </ThemedText>
                  {event.recurrence_rule && (
                    <View style={styles.recurrenceBadge}>
                      <IconSymbol name="arrow.clockwise" size={12} color={colors.primary} />
                      <ThemedText type="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                        重複
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/(tabs)/event/registrations', params: { eventId: event.id } })}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="person.fill" size={14} color={colors.primary} />
                    <ThemedText style={[styles.actionButtonText, { color: colors.primary }]}>報名</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/(tabs)/event/scores', params: { eventId: event.id } })}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="chart.bar.fill" size={14} color={colors.text} />
                    <ThemedText style={styles.actionButtonText}>記分</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => handleEdit(event)}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="pencil" size={14} color={colors.text} />
                    <ThemedText style={styles.actionButtonText}>編輯</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => handleDelete(event)}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="trash" size={14} color={colors.error} />
                    <ThemedText style={[styles.actionButtonText, { color: colors.error }]}>刪除</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
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
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
  },
  eventsList: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  eventCard: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurrenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
