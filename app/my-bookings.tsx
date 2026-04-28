import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookingWithVenue, cancelBooking, getMyBookingsWithVenue } from '@/services/venues';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const STATUS_LABELS: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  cancelled: '已取消',
  completed: '已完成',
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [bookings, setBookings] = useState<BookingWithVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getMyBookingsWithVenue(user.id)
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.status !== 'cancelled' && new Date(b.end_time) >= now
  );
  const past = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'completed' || new Date(b.end_time) < now
  );
  const list = activeTab === 'upcoming' ? upcoming : past;

  const handleCancel = (booking: BookingWithVenue) => {
    Alert.alert('取消預約', `確定要取消「${booking.venue?.name || '此預約'}」嗎？`, [
      { text: '返回', style: 'cancel' },
      {
        text: '取消預約',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(booking.id);
            load();
          } catch (e: any) {
            Alert.alert('失敗', e.message || '請稍後再試');
          }
        },
      },
    ]);
  };

  const renderCard = (b: BookingWithVenue) => {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    const dateStr = start.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });
    const timeStr = `${start.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
    const statusColor = b.status === 'confirmed' ? colors.statusSuccess
      : b.status === 'pending' ? colors.primary
      : b.status === 'cancelled' ? colors.error
      : colors.textSecondary;
    const canCancel = (b.status === 'pending' || b.status === 'confirmed') && new Date(b.start_time) > now;

    return (
      <TouchableOpacity
        key={b.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
        onPress={() => b.venue && router.push({ pathname: '/venue/[id]', params: { id: b.venue.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '15' }]}>
            <ThemedText type="label" style={{ color: statusColor }}>
              {STATUS_LABELS[b.status] || b.status}
            </ThemedText>
          </View>
          {canCancel && (
            <TouchableOpacity
              onPress={() => handleCancel(b)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <ThemedText type="label" style={{ color: colors.error }}>取消</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.venueName, { color: colors.text }]}>
          {b.venue?.name || '場地已刪除'}
        </Text>
        <View style={styles.metaRow}>
          <IconSymbol name="calendar" size={13} color={colors.textSecondary} />
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {dateStr}
          </ThemedText>
        </View>
        <View style={styles.metaRow}>
          <IconSymbol name="calendar" size={13} color={colors.textSecondary} />
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {timeStr}
          </ThemedText>
        </View>
        {b.venue?.address && (
          <View style={styles.metaRow}>
            <IconSymbol name="location.fill" size={13} color={colors.textSecondary} />
            <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {b.venue.address}
            </ThemedText>
          </View>
        )}
        {b.notes && (
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.xs }}>
            備註：{b.notes}
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader title="我的預約" />

      <View style={styles.tabRow}>
        {(['upcoming', 'past'] as const).map((tab) => {
          const selected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                { borderColor: colors.border },
                selected && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                selected && { color: colors.background },
              ]}>
                {tab === 'upcoming' ? `即將到來 (${upcoming.length})` : `過去紀錄 (${past.length})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {activeTab === 'upcoming' ? '沒有即將到來的預約' : '沒有過去的預約紀錄'}
          </ThemedText>
        </View>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {list.map(renderCard)}
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { padding: Spacing.xxl, alignItems: 'center' },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  venueName: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.xs },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
});
