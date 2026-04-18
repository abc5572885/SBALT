import { PageHeader } from '@/components/PageHeader';
import { RegionPicker } from '@/components/RegionPicker';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { DEFAULT_WEEKLY_SCHEDULE, VENUE_AMENITIES, WeeklySchedule } from '@/constants/venues';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createVenue } from '@/services/venues';
import { WeeklySchedulePicker } from '@/components/WeeklySchedulePicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function NewVenueScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [sportTypes, setSportTypes] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [openHours, setOpenHours] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleSport = (key: string) => {
    setSportTypes((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const toggleAmenity = (key: string) => {
    setAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!user || !groupId) return;
    if (!name.trim() || !address.trim()) {
      Alert.alert('缺少必填', '請填寫場地名稱與地址');
      return;
    }
    if (sportTypes.length === 0) {
      Alert.alert('缺少必填', '請選擇至少一種運動類型');
      return;
    }

    try {
      setSaving(true);
      const venue = await createVenue({
        operator_group_id: groupId,
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim(),
        region,
        sport_types: sportTypes,
        cover_image_url: null,
        hourly_rate: hourlyRate ? parseInt(hourlyRate, 10) : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        amenities,
        open_hours: openHours.trim() || null,
        weekly_schedule: weeklySchedule,
        contact_phone: contactPhone.trim() || null,
      });
      router.replace({ pathname: '/venue/[id]', params: { id: venue.id } });
    } catch (error: any) {
      Alert.alert('建立失敗', error.message || '請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="新增場地" />

      <View style={styles.form}>
        <Field label="場地名稱 *" colors={colors}>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="例：竹北國民運動中心 A 球場"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="介紹" colors={colors}>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="場地特色、規格、設備等（選填）"
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </Field>

        <Field label="地址 *" colors={colors}>
          <TextInput
            style={inputStyle}
            value={address}
            onChangeText={setAddress}
            placeholder="完整地址"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="所在區域" colors={colors}>
          <RegionPicker value={region} onChange={setRegion} placeholder="選擇縣市 / 區域" />
        </Field>

        <Field label="運動類型 *（可多選）" colors={colors}>
          <View style={styles.chipRow}>
            {SPORT_OPTIONS.filter((s) => s.key !== 'other').map((s) => {
              const selected = sportTypes.includes(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => toggleSport(s.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    selected && { color: colors.background },
                  ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="收費（NT$/小時）" colors={colors}>
          <TextInput
            style={inputStyle}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="留空表示不公開或詢價"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
          />
        </Field>

        <Field label="可容納人數" colors={colors}>
          <TextInput
            style={inputStyle}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="選填"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
          />
        </Field>

        <Field label="設施（可多選）" colors={colors}>
          <View style={styles.chipRow}>
            {VENUE_AMENITIES.map((a) => {
              const selected = amenities.includes(a.key);
              return (
                <TouchableOpacity
                  key={a.key}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => toggleAmenity(a.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    selected && { color: colors.background },
                  ]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="每週可預約時段 *" colors={colors}>
          <WeeklySchedulePicker value={weeklySchedule} onChange={setWeeklySchedule} />
        </Field>

        <Field label="營業時間備註" colors={colors}>
          <TextInput
            style={inputStyle}
            value={openHours}
            onChangeText={setOpenHours}
            placeholder="暑假延長、國定假日等例外說明（選填）"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="聯絡電話" colors={colors}>
          <TextInput
            style={inputStyle}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="選填"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
          />
        </Field>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.submitText}>{saving ? '建立中...' : '新增場地'}</Text>
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
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  submitBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
