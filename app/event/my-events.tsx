import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteEvent, getEvents, getRegistrationCounts, updateEvent } from '@/services/database';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { toast } from '@/store/useToast';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
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
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
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
      if (myEvents.length > 0) {
        const counts = await getRegistrationCounts(myEvents.map((e) => e.id));
        setRegCounts(counts);
      }
    } catch (error) {
      console.error('載入活動失敗:', error);
      toast.error('無法載入活動列表');
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
              toast.error(error.message || '刪除活動失敗');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (event: Event) => {
    router.push(`/event/${event.id}`);
  };

  const handleChangeStatus = (event: Event) => {
    const options: { text: string; status: string }[] = [];
    if (event.status === 'open') {
      options.push({ text: '關閉報名', status: 'closed' });
      options.push({ text: '取消活動', status: 'cancelled' });
    } else if (event.status === 'closed') {
      options.push({ text: '重新開放報名', status: 'open' });
      options.push({ text: '標記為已結束', status: 'finished' });
    } else if (event.status === 'cancelled') {
      options.push({ text: '重新開放', status: 'open' });
    }

    if (options.length === 0) return;

    Alert.alert('變更狀態', `目前：${getStatusLabel(event.status)}`, [
      { text: '取消', style: 'cancel' },
      ...options.map((opt) => ({
        text: opt.text,
        onPress: async () => {
          try {
            await updateEvent(event.id, { status: opt.status as any });
            loadEvents();
          } catch (error: any) {
            toast.error(error.message || '操作失敗');
          }
        },
      })),
    ]);
  };

  const handleDuplicate = (event: Event) => {
    router.push({
      pathname: '/event/new',
      params: {
        templateTitle: event.title,
        templateDescription: event.description || '',
        templateLocation: event.location,
        templateQuota: event.quota.toString(),
        templateFee: event.fee.toString(),
        templateSportType: event.sport_type || 'other',
      },
    });
  };

  const handleShare = async (event: Event) => {
    try {
      const date = new Date(event.scheduled_at);
      const dateStr = date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
      const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      await Share.share({
        message: `${event.title}\n${dateStr} ${timeStr} | ${event.location}\n${event.quota} 人${event.fee > 0 ? ` | NT$ ${event.fee}` : ''}\n\nSBALT 報名連結：sbalt://open?event=${event.id}`,
      });
    } catch (error) {
      // User cancelled
    }
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
              onPress={() => router.push('/event/new')}
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
                  <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + '15' }]}
                    onPress={() => handleChangeStatus(event)}
                    activeOpacity={0.6}
                  >
                    <ThemedText type="label" style={{ color: getStatusColor(event.status) }}>
                      {getStatusLabel(event.status)}
                    </ThemedText>
                  </TouchableOpacity>
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
                    <ThemedText type="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                      {regCounts[event.id] || 0}/{event.quota}
                    </ThemedText>
                    {' 人 · NT$ '}{event.fee}
                  </ThemedText>
                  {event.recurrence_rule && (
                    <View style={styles.recurrenceBadge}>
                      <IconSymbol name="arrow.clockwise" size={12} color={colors.textSecondary} />
                      <ThemedText type="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                        重複
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={[styles.actionSection, { borderTopColor: colors.border }]}>
                  {/* Primary actions row */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.primaryButton, { borderColor: colors.border }]} onPress={() => router.push({ pathname: '/event/registrations', params: { eventId: event.id } })} activeOpacity={0.6}>
                      <IconSymbol name="person.fill" size={18} color={colors.text} />
                      <ThemedText style={styles.primaryButtonText}>報名</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, { borderColor: colors.border }]} onPress={() => router.push({ pathname: '/event/checkin', params: { eventId: event.id } })} activeOpacity={0.6}>
                      <IconSymbol name="checkmark.circle" size={18} color={colors.text} />
                      <ThemedText style={styles.primaryButtonText}>簽到</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, { borderColor: colors.border }]} onPress={() => router.push({ pathname: '/event/matches', params: { eventId: event.id } })} activeOpacity={0.6}>
                      <IconSymbol name="chart.bar.fill" size={18} color={colors.text} />
                      <ThemedText style={styles.primaryButtonText}>記分</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, { borderColor: colors.border }]} onPress={() => handleShare(event)} activeOpacity={0.6}>
                      <IconSymbol name="paperplane.fill" size={18} color={colors.text} />
                      <ThemedText style={styles.primaryButtonText}>分享</ThemedText>
                    </TouchableOpacity>
                  </View>
                  {/* Secondary actions: text-only mini links */}
                  <View style={styles.secondaryRow}>
                    <TouchableOpacity style={styles.secondaryLink} onPress={() => handleDuplicate(event)} activeOpacity={0.5} hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}>
                      <ThemedText style={[styles.secondaryLinkText, { color: colors.textSecondary }]}>複製</ThemedText>
                    </TouchableOpacity>
                    <View style={[styles.secondaryDot, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.secondaryLink} onPress={() => handleEdit(event)} activeOpacity={0.5} hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}>
                      <ThemedText style={[styles.secondaryLinkText, { color: colors.textSecondary }]}>編輯</ThemedText>
                    </TouchableOpacity>
                    <View style={[styles.secondaryDot, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.secondaryLink} onPress={() => handleDelete(event)} activeOpacity={0.5} hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}>
                      <ThemedText style={[styles.secondaryLinkText, { color: colors.error }]}>刪除</ThemedText>
                    </TouchableOpacity>
                  </View>
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
  actionSection: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  secondaryLink: {
    paddingVertical: 2,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  secondaryDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
});
