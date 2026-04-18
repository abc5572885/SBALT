import { RegionPicker } from '@/components/RegionPicker';
import { SPORT_OPTIONS, SPORT_POSITIONS } from '@/constants/sports';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import {
  AgeRange,
  Gender,
  SportPositions as SportPositionsMap,
  updateProfile,
} from '@/services/profile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INTRO_PAGES = [
  {
    title: '揪團',
    subtitle: '一鍵建立活動\n朋友報名、付款、簽到全搞定',
  },
  {
    title: '記分',
    subtitle: '全螢幕計分板\n籃球、排球、羽球各有專屬按鈕',
  },
  {
    title: '社群',
    subtitle: '建立球隊群組\n固定班底、公告、活動一手掌握',
  },
];

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

type Step = 'intro' | 'profile';

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('intro');
  const [currentPage, setCurrentPage] = useState(0);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [favoriteSports, setFavoriteSports] = useState<string[]>([]);
  const [sportPositions, setSportPositions] = useState<SportPositionsMap>({});
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/(tabs)');
  };

  const handleIntroNext = () => {
    if (currentPage < INTRO_PAGES.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      setStep('profile');
    }
  };

  const toggleSport = (key: string) => {
    setFavoriteSports((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const togglePosition = (sport: string, position: string) => {
    setSportPositions((prev) => {
      const key = sport as keyof SportPositionsMap;
      const current = prev[key] || [];
      const next = current.includes(position)
        ? current.filter((p) => p !== position)
        : [...current, position];
      return { ...prev, [key]: next.length ? next : undefined };
    });
  };

  const handleSaveProfile = async () => {
    if (!user) {
      await finish();
      return;
    }

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
      if (displayName.trim() && displayName.trim() !== user.displayName) {
        await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });
      }
      await updateProfile(user.id, {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        region,
        height: h,
        weight: w,
        gender,
        age_range: ageRange,
        favorite_sports: favoriteSports,
        sport_positions: sportPositions,
      } as any);
      await finish();
    } catch (error: any) {
      Alert.alert('儲存失敗', error.message || '稍後可在個人頁再填寫', [
        { text: '略過', onPress: () => finish() },
        { text: '重試' },
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'intro') {
    const page = INTRO_PAGES[currentPage];
    const isLast = currentPage === INTRO_PAGES.length - 1;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.skipButton} onPress={() => setStep('profile')} activeOpacity={0.6}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>跳過</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{page.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{page.subtitle}</Text>
        </View>

        <View style={styles.dots}>
          {INTRO_PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentPage ? colors.text : colors.disabled },
              ]}
            />
          ))}
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.text }]}
            onPress={handleIntroNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextText, { color: colors.background }]}>
              {isLast ? '下一步' : '下一步'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Profile questionnaire
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.skipButton} onPress={finish} activeOpacity={0.6}>
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>稍後再填</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.formTitle, { color: colors.text }]}>建立你的運動檔案</Text>
        <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
          幫我們了解你，推薦合適的活動與夥伴
        </Text>

        {/* Display name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>暱稱</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="讓其他人認識你"
            placeholderTextColor={colors.disabled}
            maxLength={30}
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>自我介紹</Text>
          <TextInput
            style={[styles.input, styles.bioInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={bio}
            onChangeText={setBio}
            placeholder="一句話介紹自己（選填）"
            placeholderTextColor={colors.disabled}
            multiline
            maxLength={150}
          />
          <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'right', marginTop: 4 }}>
            {bio.length}/150
          </Text>
        </View>

        {/* Region */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>活動區域</Text>
          <RegionPicker value={region} onChange={setRegion} />
        </View>

        {/* Gender */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>性別</Text>
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

        {/* Age */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>年齡層</Text>
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

        {/* Height/Weight */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>身體數據</Text>
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
              value={height}
              onChangeText={setHeight}
              placeholder="身高 (cm)"
              placeholderTextColor={colors.disabled}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="體重 (kg)"
              placeholderTextColor={colors.disabled}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Favorite sports */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>喜好運動（可多選）</Text>
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

        {/* Positions */}
        {favoriteSports.map((sportKey) => {
          const positions = SPORT_POSITIONS[sportKey];
          if (!positions) return null;
          const sportLabel = SPORT_OPTIONS.find((s) => s.key === sportKey)?.label || sportKey;
          const currentPositions = sportPositions[sportKey as keyof SportPositionsMap] || [];

          return (
            <View key={sportKey} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {sportLabel} — {sportKey === 'badminton' ? '偏好（可多選）' : sportKey === 'running' ? '類型（可多選）' : '位置（可多選）'}
              </Text>
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

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.text }, saving && { opacity: 0.5 }]}
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextText, { color: colors.background }]}>
            {saving ? '儲存中...' : '開始使用'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: Spacing.lg,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '400',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  nextButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
  },
  formContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  formSubtitle: {
    fontSize: 15,
    marginBottom: Spacing.xl,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  optionBtn: {
    flex: 1,
    minWidth: 60,
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
  bioInput: {
    height: 72,
    textAlignVertical: 'top',
  },
});
