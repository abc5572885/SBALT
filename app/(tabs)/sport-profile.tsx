import { PageHeader } from '@/components/PageHeader';
import { RegionPicker } from '@/components/RegionPicker';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { SPORT_OPTIONS, SPORT_POSITIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getProfile,
  updateProfile,
  Gender,
  AgeRange,
  SportPositions,
} from '@/services/profile';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: 'male', label: '男' },
  { key: 'female', label: '女' },
  { key: 'other', label: '不透露' },
];

const AGE_OPTIONS: { key: AgeRange; label: string }[] = [
  { key: '18-24', label: '18-24' },
  { key: '25-34', label: '25-34' },
  { key: '35-44', label: '35-44' },
  { key: '45+', label: '45+' },
];

export default function SportProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [favoriteSports, setFavoriteSports] = useState<string[]>([]);
  const [sportPositions, setSportPositions] = useState<SportPositions>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      getProfile(user.id).then((p) => {
        if (p) {
          setHeight(p.height?.toString() || '');
          setWeight(p.weight?.toString() || '');
          setGender(p.gender || null);
          setAgeRange(p.age_range || null);
          setRegion(p.region || null);
          setFavoriteSports(p.favorite_sports || []);
          const raw = (p.sport_positions || {}) as Record<string, any>;
          const normalized: SportPositions = {};
          (['basketball', 'volleyball', 'badminton', 'running'] as const).forEach((k) => {
            const v = raw[k];
            if (Array.isArray(v)) normalized[k] = v;
            else if (typeof v === 'string' && v) normalized[k] = [v];
          });
          setSportPositions(normalized);
        }
        setLoaded(true);
      });
    }
  }, [user]);

  const toggleSport = (key: string) => {
    setFavoriteSports((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const togglePosition = (sport: string, position: string) => {
    setSportPositions((prev) => {
      const key = sport as keyof SportPositions;
      const current = prev[key] || [];
      const next = current.includes(position)
        ? current.filter((p) => p !== position)
        : [...current, position];
      return { ...prev, [key]: next.length ? next : undefined };
    });
  };

  const handleSave = async () => {
    if (!user) return;

    const h = height ? parseInt(height, 10) : null;
    const w = weight ? parseInt(weight, 10) : null;

    if (h !== null && (h < 100 || h > 250)) {
      Alert.alert('驗證失敗', '身高請輸入 100-250 cm');
      return;
    }
    if (w !== null && (w < 30 || w > 200)) {
      Alert.alert('驗證失敗', '體重請輸入 30-200 kg');
      return;
    }

    try {
      setSaving(true);
      await updateProfile(user.id, {
        height: h,
        weight: w,
        gender,
        age_range: ageRange,
        region,
        favorite_sports: favoriteSports,
        sport_positions: sportPositions,
      } as any);

      Alert.alert('儲存成功', '運動資料已更新', [
        { text: '確定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="運動資料" />

      {/* Gender */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>性別</ThemedText>
        <View style={styles.optionRow}>
          {GENDER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.optionBtn,
                { borderColor: colors.border },
                gender === opt.key && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              onPress={() => setGender(gender === opt.key ? null : opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: colors.textSecondary },
                gender === opt.key && { color: colors.background },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Age range */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>年齡層</ThemedText>
        <View style={styles.optionRow}>
          {AGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.optionBtn,
                { borderColor: colors.border },
                ageRange === opt.key && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              onPress={() => setAgeRange(ageRange === opt.key ? null : opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: colors.textSecondary },
                ageRange === opt.key && { color: colors.background },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Region */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>活動區域</ThemedText>
        <RegionPicker value={region} onChange={setRegion} />
      </View>

      {/* Height & Weight */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>身體數據</ThemedText>
        <View style={styles.rowInput}>
          <View style={styles.halfField}>
            <TextInput
              style={inputStyle}
              value={height}
              onChangeText={setHeight}
              placeholder="身高 (cm)"
              placeholderTextColor={colors.disabled}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.halfField}>
            <TextInput
              style={inputStyle}
              value={weight}
              onChangeText={setWeight}
              placeholder="體重 (kg)"
              placeholderTextColor={colors.disabled}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      {/* Favorite sports */}
      <View style={styles.fieldGroup}>
        <ThemedText type="label" style={styles.label}>喜好運動（可多選）</ThemedText>
        <View style={styles.optionRow}>
          {SPORT_OPTIONS.filter((s) => s.key !== 'other').map((sport) => (
            <TouchableOpacity
              key={sport.key}
              style={[
                styles.optionBtn,
                { borderColor: colors.border },
                favoriteSports.includes(sport.key) && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              onPress={() => toggleSport(sport.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: colors.textSecondary },
                favoriteSports.includes(sport.key) && { color: colors.background },
              ]}>
                {sport.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sport-specific positions */}
      {favoriteSports.map((sportKey) => {
        const positions = SPORT_POSITIONS[sportKey];
        if (!positions) return null;
        const sportLabel = SPORT_OPTIONS.find((s) => s.key === sportKey)?.label || sportKey;
        const currentPositions = sportPositions[sportKey as keyof SportPositions] || [];

        return (
          <View key={sportKey} style={styles.fieldGroup}>
            <ThemedText type="label" style={styles.label}>
              {sportLabel} — {sportKey === 'badminton' ? '偏好（可多選）' : sportKey === 'running' ? '類型（可多選）' : '位置（可多選）'}
            </ThemedText>
            <View style={styles.positionGrid}>
              {positions.map((pos) => {
                const selected = currentPositions.includes(pos.key);
                return (
                  <TouchableOpacity
                    key={pos.key}
                    style={[
                      styles.positionBtn,
                      { borderColor: colors.border },
                      selected && { backgroundColor: colors.text, borderColor: colors.text },
                    ]}
                    onPress={() => togglePosition(sportKey, pos.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.positionText,
                      { color: colors.textSecondary },
                      selected && { color: colors.background },
                    ]}>
                      {pos.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.text }, Shadows.sm, saving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={[styles.saveBtnText, { color: colors.background }]}>
          {saving ? '儲存中...' : '儲存'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowInput: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  input: {
    fontSize: 15,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  positionBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  positionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
