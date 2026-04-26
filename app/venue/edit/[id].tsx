import { PageHeader } from '@/components/PageHeader';
import { RegionPicker } from '@/components/RegionPicker';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { DEFAULT_WEEKLY_SCHEDULE, VENUE_AMENITIES, WeeklySchedule } from '@/constants/venues';
import { WeeklySchedulePicker } from '@/components/WeeklySchedulePicker';
import { toast } from '@/store/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupById } from '@/services/groups';
import { deleteVenue, getVenueById, updateVenue } from '@/services/venues';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EditVenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const v = await getVenueById(id);
        if (!v) {
          Alert.alert('錯誤', '找不到場地', [{ text: '確定', onPress: () => router.back() }]);
          return;
        }
        const g = v.operator_group_id ? await getGroupById(v.operator_group_id) : null;
        if (g?.creator_id !== user?.id) {
          Alert.alert('無權限', '只有場地方可以編輯', [{ text: '確定', onPress: () => router.back() }]);
          return;
        }
        setAuthorized(true);
        setName(v.name);
        setDescription(v.description || '');
        setAddress(v.address);
        setRegion(v.region);
        setSportTypes(v.sport_types);
        setHourlyRate(v.hourly_rate?.toString() || '');
        setCapacity(v.capacity?.toString() || '');
        setAmenities(v.amenities);
        setOpenHours(v.open_hours || '');
        setWeeklySchedule(v.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE);
        setContactPhone(v.contact_phone || '');
        setStatus(v.status);
      } catch (e: any) {
        toast.error(e.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user?.id, router]);

  const toggleSport = (key: string) => {
    setSportTypes((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  };

  const toggleAmenity = (key: string) => {
    setAmenities((prev) => prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    if (!id) return;
    if (!name.trim() || !address.trim()) {
      Alert.alert('缺少必填', '請填寫場地名稱與地址');
      return;
    }
    try {
      setSaving(true);
      await updateVenue(id, {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim(),
        region,
        sport_types: sportTypes,
        hourly_rate: hourlyRate ? parseInt(hourlyRate, 10) : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        amenities,
        open_hours: openHours.trim() || null,
        weekly_schedule: weeklySchedule,
        contact_phone: contactPhone.trim() || null,
        status,
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
    Alert.alert('刪除場地', '確定要刪除此場地嗎？所有預約資料都會一併刪除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await deleteVenue(id);
            router.dismissAll();
          } catch (e: any) {
            toast.error(e.message || '刪除失敗');
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="編輯場地" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!authorized) return null;

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="編輯場地" />

      <View style={styles.form}>
        <Field label="狀態" colors={colors}>
          <View style={styles.chipRow}>
            {(['active', 'inactive'] as const).map((s) => {
              const selected = status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => setStatus(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    selected && { color: colors.background },
                  ]}>
                    {s === 'active' ? '開放中' : '已下架'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="場地名稱 *" colors={colors}>
          <TextInput style={inputStyle} value={name} onChangeText={setName} placeholderTextColor={colors.placeholder} />
        </Field>

        <Field label="介紹" colors={colors}>
          <TextInput style={[inputStyle, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholderTextColor={colors.placeholder} />
        </Field>

        <Field label="地址 *" colors={colors}>
          <TextInput style={inputStyle} value={address} onChangeText={setAddress} placeholderTextColor={colors.placeholder} />
        </Field>

        <Field label="所在區域" colors={colors}>
          <RegionPicker value={region} onChange={setRegion} placeholder="選擇縣市 / 區域" />
        </Field>

        <Field label="運動類型（可多選）" colors={colors}>
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
          <TextInput style={inputStyle} value={hourlyRate} onChangeText={setHourlyRate} keyboardType="number-pad" placeholderTextColor={colors.placeholder} />
        </Field>

        <Field label="可容納人數" colors={colors}>
          <TextInput style={inputStyle} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholderTextColor={colors.placeholder} />
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
          <TextInput style={inputStyle} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor={colors.placeholder} />
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
        <Text style={[styles.deleteText, { color: colors.error }]}>刪除場地</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

function Field({ label, colors, children }: { label: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>{label}</ThemedText>
      {children}
    </View>
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
  deleteBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteText: { fontSize: 16, fontWeight: '700' },
});
