import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupById } from '@/services/groups';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import {
  getAllVenueBookings,
  getVenueById,
  updateBookingStatus,
  Venue,
  VenueBooking,
} from '@/services/venues';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

export default function VenueBookingsManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [venue, setVenue] = useState<Venue | null>(null);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'all'>('pending');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const v = await getVenueById(id);
      if (!v) {
        setLoading(false);
        return;
      }
      const g = v.operator_group_id ? await getGroupById(v.operator_group_id) : null;
      if (g?.creator_id !== user?.id) {
        Alert.alert('無權限', '只有場地方可以管理預約', [{ text: '確定', onPress: () => router.back() }]);
        return;
      }
      setAuthorized(true);
      setVenue(v);
      const b = await getAllVenueBookings(v.id);
      setBookings(b);
      if (b.length > 0) {
        const p = await getProfilesByIds(b.map((x) => x.user_id));
        setProfiles(p);
      }
    } catch (e: any) {
      Alert.alert('載入失敗', e.message || '請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const pending = bookings.filter((b) => b.status === 'pending');
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.end_time) >= now);
  const list = activeTab === 'pending' ? pending : activeTab === 'upcoming' ? upcoming : bookings;

  const handleUpdate = async (booking: VenueBooking, status: VenueBooking['status']) => {
    try {
      await updateBookingStatus(booking.id, status);
      load();
    } catch (e: any) {
      Alert.alert('失敗', e.message || '請稍後再試');
    }
  };

  const confirmAction = (booking: VenueBooking, status: VenueBooking['status'], label: string) => {
    Alert.alert(label, '確定要執行此動作嗎？', [
      { text: '返回', style: 'cancel' },
      { text: label, onPress: () => handleUpdate(booking, status) },
    ]);
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="預約管理" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!authorized || !venue) return null;

  const renderCard = (b: VenueBooking) => {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    const dateStr = start.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
    const timeStr = `${start.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
    const name = getDisplayName(profiles[b.user_id], b.user_id, false);
    const statusColor = b.status === 'confirmed' ? colors.statusSuccess
      : b.status === 'pending' ? colors.primary
      : b.status === 'cancelled' ? colors.error
      : colors.textSecondary;
    const isPast = new Date(b.end_time) < now;

    return (
      <View
        key={b.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '15' }]}>
            <ThemedText type="label" style={{ color: statusColor }}>
              {STATUS_LABELS[b.status] || b.status}
            </ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {dateStr} {timeStr}
          </ThemedText>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/user/${b.user_id}`)}
          activeOpacity={0.7}
          style={styles.userRow}
        >
          <IconSymbol name="person.fill" size={14} color={colors.textSecondary} />
          <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
        </TouchableOpacity>

        {b.notes && (
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: 4 }}>
            備註：{b.notes}
          </ThemedText>
        )}

        {/* Actions */}
        {b.status === 'pending' && !isPast && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.statusSuccess }]}
              onPress={() => confirmAction(b, 'confirmed', '確認預約')}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>確認</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.error }]}
              onPress={() => confirmAction(b, 'cancelled', '拒絕預約')}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>拒絕</Text>
            </TouchableOpacity>
          </View>
        )}
        {b.status === 'confirmed' && isPast && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.text }]}
              onPress={() => confirmAction(b, 'completed', '標記完成')}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: colors.background }]}>標記已完成</Text>
            </TouchableOpacity>
          </View>
        )}
        {b.status === 'confirmed' && !isPast && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.error, borderWidth: 1 }]}
              onPress={() => confirmAction(b, 'cancelled', '取消預約')}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: colors.error }]}>取消預約</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader title="預約管理" />

      <View style={styles.venueInfo}>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>場地</ThemedText>
        <Text style={[styles.venueName, { color: colors.text }]}>{venue.name}</Text>
      </View>

      <View style={styles.tabRow}>
        {([
          { key: 'pending', label: `待確認 (${pending.length})` },
          { key: 'upcoming', label: `已確認 (${upcoming.length})` },
          { key: 'all', label: `全部 (${bookings.length})` },
        ] as const).map((t) => {
          const selected = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tab,
                { borderColor: colors.border },
                selected && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                selected && { color: colors.background },
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {list.length === 0 ? (
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            目前沒有{activeTab === 'pending' ? '待確認' : activeTab === 'upcoming' ? '已確認' : ''}預約
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
  venueInfo: { marginBottom: Spacing.lg, gap: 2 },
  venueName: { fontSize: 18, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  userName: { fontSize: 15, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
