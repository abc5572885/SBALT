import { PageHeader } from '@/components/PageHeader';
import { RegionPicker } from '@/components/RegionPicker';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { TOURNAMENT_FORMATS, TournamentFormat } from '@/constants/tournaments';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupById } from '@/services/groups';
import { createTournament } from '@/services/tournaments';
import { toast } from '@/store/useToast';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function NewTournamentScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportType, setSportType] = useState('basketball');
  const [format, setFormat] = useState<TournamentFormat>('single_elim');
  const [registrationType, setRegistrationType] = useState<'individual' | 'team'>('individual');
  const [teamSize, setTeamSize] = useState('3');
  const [startDate, setStartDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (groupId) {
      getGroupById(groupId).then((g) => {
        if (g?.sport_type) setSportType(g.sport_type);
      });
    }
  }, [groupId]);

  const handleSave = async () => {
    if (!user || !groupId) return;
    if (!title.trim() || !location) {
      Alert.alert('缺少必填', '請填寫賽事名稱與地點');
      return;
    }

    try {
      setSaving(true);
      const tournament = await createTournament({
        organizer_group_id: groupId,
        title: title.trim(),
        description: description.trim() || null,
        sport_type: sportType,
        format,
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
        cover_image_url: null,
        registration_type: registrationType,
        team_size: registrationType === 'team' ? (parseInt(teamSize, 10) || 3) : null,
      });
      router.replace({ pathname: '/tournament/[id]', params: { id: tournament.id } });
    } catch (error: any) {
      toast.error(error.message || '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="建立賽事" />

      <View style={styles.form}>
        <Field label="賽事名稱 *" colors={colors}>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="例：2026 春季盃 3v3 籃球賽"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="描述" colors={colors}>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="賽事介紹（選填）"
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

        <Field label="報名方式" colors={colors}>
          <View style={styles.sportRow}>
            {(['individual', 'team'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.sportChip,
                  { borderColor: colors.border },
                  registrationType === t && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => setRegistrationType(t)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sportText,
                  { color: colors.textSecondary },
                  registrationType === t && { color: colors.background },
                ]}>
                  {t === 'individual' ? '個人報名' : '隊伍報名'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {registrationType === 'team' && (
          <Field label="每隊人數 *" colors={colors}>
            <TextInput
              style={inputStyle}
              value={teamSize}
              onChangeText={setTeamSize}
              placeholder="例：3（3v3）、5（5v5）"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
            />
          </Field>
        )}

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
            placeholder="例：竹北體育館"
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
          <Field label="付款方式 *" colors={colors}>
            <TextInput
              style={[inputStyle, styles.textArea]}
              value={paymentInfo}
              onChangeText={setPaymentInfo}
              placeholder="例：臨場付現 / 匯款 國泰 008-1234567890 / LINE Pay @sbalt"
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
            placeholder="例：冠軍 NT$ 30,000 + 獎盃"
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
            placeholder="比賽規則、裝備要求、注意事項等"
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
        <Text style={styles.submitText}>{saving ? '建立中...' : '建立賽事'}</Text>
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

function DatePickerRow({ value, onChange, showPicker, setShowPicker, colors, themeVariant, mode = 'date', allowClear }: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  showPicker: boolean;
  setShowPicker: (s: boolean) => void;
  colors: any;
  themeVariant: 'light' | 'dark';
  mode?: 'date' | 'datetime';
  allowClear?: boolean;
}) {
  const display = value
    ? value.toLocaleDateString('zh-TW', mode === 'datetime'
        ? { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: 'numeric', day: 'numeric' })
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
            mode={mode}
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
});
