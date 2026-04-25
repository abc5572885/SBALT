import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createBooking,
  getVenueBookings,
  getVenueById,
  Venue,
  VenueBooking,
} from '@/services/venues';
import { getDayKeyFromDate, DEFAULT_WEEKLY_SCHEDULE } from '@/constants/venues';
import { toast } from '@/store/useToast';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function isoMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export default function BookVenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [venue, setVenue] = useState<Venue | null>(null);
  const [existingBookings, setExistingBookings] = useState<VenueBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startHour, setStartHour] = useState(18); // default 18:00
  const [durationHours, setDurationHours] = useState(2);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const v = await getVenueById(id);
        if (!v) {
          Alert.alert('錯誤', '找不到場地', [{ text: '確定', onPress: () => router.back() }]);
          return;
        }
        setVenue(v);
        const b = await getVenueBookings(v.id, new Date());
        setExistingBookings(b);
      } catch (e: any) {
        toast.error(e.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="預約場地" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!venue) return null;

  const schedule = venue.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE;
  const dayKey = getDayKeyFromDate(selectedDate);
  const daySchedule = schedule[dayKey];
  const isClosedDay = daySchedule === null;

  // Available start hours: from schedule.start to schedule.end - 1 (must have at least 1hr duration)
  const availableHours: number[] = daySchedule
    ? Array.from({ length: Math.max(0, daySchedule.end - daySchedule.start) }, (_, i) => daySchedule.start + i).filter((h) => h < daySchedule.end)
    : [];

  // Ensure startHour is within schedule; if not, auto-snap
  const effectiveStart = daySchedule
    ? (startHour >= daySchedule.start && startHour < daySchedule.end ? startHour : daySchedule.start)
    : startHour;

  // Max duration limited by schedule end
  const maxDuration = daySchedule ? daySchedule.end - effectiveStart : 0;

  const chosenStart = (() => {
    const d = isoMidnight(selectedDate);
    d.setHours(effectiveStart);
    return d;
  })();
  const effectiveDuration = Math.min(durationHours, maxDuration || 1);
  const chosenEnd = addHours(chosenStart, effectiveDuration);

  // Check conflict
  const conflict = existingBookings.find((b) =>
    rangesOverlap(chosenStart, chosenEnd, new Date(b.start_time), new Date(b.end_time))
  );

  const totalCost = venue.hourly_rate ? venue.hourly_rate * effectiveDuration : null;

  const handleBook = async () => {
    if (!user) return;
    if (isClosedDay) {
      Alert.alert('公休日', '此日期場地不開放預約');
      return;
    }
    if (conflict) {
      Alert.alert('時段衝突', '此時段已有預約，請選其他時間');
      return;
    }
    if (chosenStart < new Date()) {
      Alert.alert('時段錯誤', '不能預約過去的時間');
      return;
    }

    try {
      setSaving(true);
      await createBooking({
        venue_id: venue.id,
        user_id: user.id,
        start_time: chosenStart.toISOString(),
        end_time: chosenEnd.toISOString(),
        notes: notes.trim() || undefined,
      });
      toast.success('已送出預約，等待場地方確認');
      router.back();
    } catch (error: any) {
      toast.error(error.message || '預約失敗');
    } finally {
      setSaving(false);
    }
  };

  const dateStr = selectedDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });

  return (
    <ScreenLayout scrollable>
      <PageHeader title="預約場地" />

      <View style={styles.venueCard}>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>場地</ThemedText>
        <Text style={[styles.venueName, { color: colors.text }]}>{venue.name}</Text>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>{venue.address}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>日期</ThemedText>
        <TouchableOpacity
          style={[styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.text, fontSize: 15 }}>{dateStr}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant={colorScheme ?? 'light'}
              textColor={colors.text}
              locale="zh-Hant-TW"
              minimumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (d) setSelectedDate(d);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.iosConfirm, { backgroundColor: colors.text }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: colors.background, fontWeight: '600' }}>確定</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {isClosedDay ? (
        <View style={[styles.closedBanner, { backgroundColor: colors.error + '10', borderColor: colors.error + '40' }]}>
          <Text style={{ color: colors.error, fontSize: 14, fontWeight: '600' }}>
            此日期場地公休，請選擇其他日期
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
              開始時間（當日可預約 {String(daySchedule!.start).padStart(2, '0')}:00 – {String(daySchedule!.end).padStart(2, '0')}:00）
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
              {availableHours.map((h) => {
                const selected = effectiveStart === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.hourChip,
                      { borderColor: colors.border },
                      selected && { backgroundColor: colors.text, borderColor: colors.text },
                    ]}
                    onPress={() => setStartHour(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.hourText,
                      { color: colors.textSecondary },
                      selected && { color: colors.background },
                    ]}>
                      {String(h).padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>時長</ThemedText>
            <View style={styles.durationRow}>
              {[1, 2, 3, 4].map((h) => {
                const selected = effectiveDuration === h;
                const exceedsSchedule = h > maxDuration;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.durationBtn,
                      { borderColor: colors.border },
                      selected && { backgroundColor: colors.text, borderColor: colors.text },
                      exceedsSchedule && { opacity: 0.3 },
                    ]}
                    onPress={() => !exceedsSchedule && setDurationHours(h)}
                    disabled={exceedsSchedule}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.durationText,
                      { color: colors.textSecondary },
                      selected && { color: colors.background },
                    ]}>
                      {h} 小時
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>備註</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="用途、人數等（選填）"
          placeholderTextColor={colors.placeholder}
          multiline
        />
      </View>

      {/* Summary */}
      {!isClosedDay && (
        <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
          <SummaryRow label="時段" value={`${String(effectiveStart).padStart(2, '0')}:00 – ${String(effectiveStart + effectiveDuration).padStart(2, '0')}:00`} colors={colors} />
          {totalCost !== null ? (
            <SummaryRow label="費用" value={`NT$ ${totalCost}`} colors={colors} />
          ) : (
            <SummaryRow label="費用" value="請向場地方詢問" colors={colors} />
          )}
          {conflict && (
            <Text style={{ color: colors.error, fontSize: 13, marginTop: Spacing.sm }}>
              此時段與其他預約衝突
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: colors.primary },
          Shadows.sm,
          (saving || conflict || isClosedDay) && { opacity: 0.4 },
        ]}
        onPress={handleBook}
        disabled={saving || !!conflict || isClosedDay}
        activeOpacity={0.7}
      >
        <Text style={styles.submitText}>
          {saving ? '送出中...' : isClosedDay ? '公休日' : conflict ? '時段衝突' : '送出預約'}
        </Text>
      </TouchableOpacity>

      <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm }}>
        預約送出後需場地方確認
      </ThemedText>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

function SummaryRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  venueCard: {
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: 2,
  },
  venueName: { fontSize: 18, fontWeight: '700' },
  section: { marginBottom: Spacing.xl },
  label: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  hourRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  hourChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  hourText: { fontSize: 13, fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: Spacing.sm },
  durationBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  durationText: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  summary: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  pickerWrap: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iosConfirm: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  submitBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  closedBanner: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
});
