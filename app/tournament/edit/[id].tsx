import { PageHeader } from '@/components/PageHeader';
import { RegionPicker } from '@/components/RegionPicker';
import { toast } from '@/store/useToast';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { TOURNAMENT_FORMATS, TournamentFormat, TournamentStatus, TOURNAMENT_STATUS_LABELS } from '@/constants/tournaments';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupById } from '@/services/groups';
import { deleteTournament, getTournamentById, updateTournament } from '@/services/tournaments';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EditTournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportType, setSportType] = useState('basketball');
  const [format, setFormat] = useState<TournamentFormat>('single_elim');
  const [status, setStatus] = useState<TournamentStatus>('open');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [prizePool, setPrizePool] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [rules, setRules] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const t = await getTournamentById(id);
        if (!t) {
          Alert.alert('錯誤', '找不到賽事', [{ text: '確定', onPress: () => router.back() }]);
          return;
        }
        const g = await getGroupById(t.organizer_group_id);
        if (g?.creator_id !== user?.id) {
          Alert.alert('無權限', '只有主辦方可以編輯此賽事', [{ text: '確定', onPress: () => router.back() }]);
          return;
        }
        setAuthorized(true);
        setTitle(t.title);
        setDescription(t.description || '');
        setSportType(t.sport_type);
        setFormat(t.format);
        setStatus(t.status);
        setStartDate(new Date(t.start_date));
        setEndDate(t.end_date ? new Date(t.end_date) : null);
        setDeadline(t.registration_deadline ? new Date(t.registration_deadline) : null);
        setLocation(t.location);
        setVenue(t.venue || '');
        setEntryFee(t.entry_fee ? t.entry_fee.toString() : '');
        setPaymentInfo(t.payment_info || '');
        setPrizePool(t.prize_pool || '');
        setMaxParticipants(t.max_participants ? t.max_participants.toString() : '');
        setRules(t.rules || '');
      } catch (e: any) {
        toast.error(e.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user?.id, router]);

  const handleSave = async () => {
    if (!id) return;
    if (!title.trim() || !location) {
      Alert.alert('缺少必填', '請填寫賽事名稱與地點');
      return;
    }
    try {
      setSaving(true);
      await updateTournament(id, {
        title: title.trim(),
        description: description.trim() || null,
        sport_type: sportType,
        format,
        status,
        start_date: startDate.toISOString(),
        end_date: endDate ? endDate.toISOString() : null,
        registration_deadline: deadline ? deadline.toISOString() : null,
        location: location,
        venue: venue.trim() || null,
        entry_fee: parseInt(entryFee, 10) || 0,
        payment_info: paymentInfo.trim() || null,
        prize_pool: prizePool.trim() || null,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        rules: rules.trim() || null,
      });
      router.back();
    } catch (error: any) {
      toast.error(error.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('刪除賽事', '確定要刪除此賽事嗎？所有報名資料都會一併刪除，此動作無法復原。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await deleteTournament(id);
            router.dismissAll();
          } catch (error: any) {
            toast.error(error.message || '刪除失敗');
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="編輯賽事" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!authorized) return null;

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }];
  const statusKeys: TournamentStatus[] = ['draft', 'open', 'closed', 'ongoing', 'finished', 'cancelled'];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="編輯賽事" />

      <View style={styles.form}>
        <Field label="賽事名稱 *" colors={colors}>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="狀態" colors={colors}>
          <View style={styles.sportRow}>
            {statusKeys.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sportChip,
                  { borderColor: colors.border },
                  status === s && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => setStatus(s)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sportText,
                  { color: colors.textSecondary },
                  status === s && { color: colors.background },
                ]}>
                  {TOURNAMENT_STATUS_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="描述" colors={colors}>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </Field>

        <Field label="運動類型" colors={colors}>
          <View style={styles.sportRow}>
            {SPORT_OPTIONS.filter((s) => s.key !== 'other').map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.sportChip,
                  { borderColor: colors.border },
                  sportType === s.key && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => setSportType(s.key)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sportText,
                  { color: colors.textSecondary },
                  sportType === s.key && { color: colors.background },
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="賽制" colors={colors}>
          <View style={styles.formatList}>
            {TOURNAMENT_FORMATS.map((f) => {
              const selected = format === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.formatCard,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selected && { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
                  ]}
                  onPress={() => setFormat(f.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.formatLabel,
                    { color: colors.text },
                    selected && { color: colors.primary, fontWeight: '700' },
                  ]}>
                    {f.label}
                  </Text>
                  <Text style={[styles.formatDesc, { color: colors.textSecondary }]}>{f.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="開始日期 *" colors={colors}>
          <DatePickerRow
            value={startDate}
            onChange={(d) => d && setStartDate(d)}
            showPicker={showStartPicker}
            setShowPicker={setShowStartPicker}
            colors={colors}
            themeVariant={colorScheme ?? 'light'}
          />
        </Field>

        <Field label="結束日期" colors={colors}>
          <DatePickerRow
            value={endDate}
            onChange={setEndDate}
            showPicker={showEndPicker}
            setShowPicker={setShowEndPicker}
            colors={colors}
            themeVariant={colorScheme ?? 'light'}
            allowClear
          />
        </Field>

        <Field label="報名截止" colors={colors}>
          <DatePickerRow
            value={deadline}
            onChange={setDeadline}
            showPicker={showDeadlinePicker}
            setShowPicker={setShowDeadlinePicker}
            colors={colors}
            themeVariant={colorScheme ?? 'light'}
            allowClear
          />
        </Field>

        <Field label="地點（縣市/區域）*" colors={colors}>
          <RegionPicker value={location} onChange={setLocation} placeholder="選擇縣市 / 區域" />
        </Field>

        <Field label="場館" colors={colors}>
          <TextInput
            style={inputStyle}
            value={venue}
            onChangeText={setVenue}
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="報名費（NT$）" colors={colors}>
          <TextInput
            style={inputStyle}
            value={entryFee}
            onChangeText={setEntryFee}
            placeholder="0 表示免費"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
          />
        </Field>

        {parseInt(entryFee, 10) > 0 && (
          <Field label="付款方式" colors={colors}>
            <TextInput
              style={[inputStyle, styles.textArea]}
              value={paymentInfo}
              onChangeText={setPaymentInfo}
              placeholder="例：臨場付現 / 匯款 國泰 008-1234567890"
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </Field>
        )}

        <Field label="獎金 / 獎品" colors={colors}>
          <TextInput
            style={inputStyle}
            value={prizePool}
            onChangeText={setPrizePool}
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="名額上限" colors={colors}>
          <TextInput
            style={inputStyle}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="留空表示不限"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
          />
        </Field>

        <Field label="賽事規則" colors={colors}>
          <TextInput
            style={[inputStyle, styles.textArea, { minHeight: 100 }]}
            value={rules}
            onChangeText={setRules}
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </Field>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.submitText}>{saving ? '儲存中...' : '儲存變更'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteBtn, { borderColor: colors.error }, saving && { opacity: 0.5 }]}
        onPress={handleDelete}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={[styles.deleteText, { color: colors.error }]}>刪除賽事</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

function Field({ label, colors, children }: { label: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function DatePickerRow({ value, onChange, showPicker, setShowPicker, colors, themeVariant, allowClear }: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  showPicker: boolean;
  setShowPicker: (s: boolean) => void;
  colors: any;
  themeVariant: 'light' | 'dark';
  allowClear?: boolean;
}) {
  const display = value
    ? value.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
    : '選擇日期';
  return (
    <>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <TouchableOpacity
          style={[styles.input, styles.dateBtn, { borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: value ? colors.text : colors.disabled, fontSize: 15 }}>{display}</Text>
        </TouchableOpacity>
        {allowClear && value && (
          <TouchableOpacity
            style={[styles.clearDateBtn, { borderColor: colors.border }]}
            onPress={() => onChange(null)}
            activeOpacity={0.6}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>清除</Text>
          </TouchableOpacity>
        )}
      </View>
      {showPicker && (
        <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DateTimePicker
            value={value || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant={themeVariant}
            textColor={colors.text}
            locale="zh-Hant-TW"
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShowPicker(false);
              if (d) onChange(d);
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.iosConfirm, { backgroundColor: colors.text }]}
              onPress={() => setShowPicker(false)}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>確定</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  form: { gap: Spacing.xl, marginBottom: Spacing.xl },
  field: {},
  label: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sportRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  sportText: { fontSize: 13, fontWeight: '600' },
  formatList: { gap: Spacing.sm },
  formatCard: {
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 2,
  },
  formatLabel: { fontSize: 15, fontWeight: '600' },
  formatDesc: { fontSize: 12 },
  dateBtn: { justifyContent: 'center' },
  clearDateBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
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
  deleteBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteText: { fontSize: 16, fontWeight: '700' },
});
