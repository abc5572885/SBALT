import { PageHeader } from '@/components/PageHeader';
import { RegionPicker } from '@/components/RegionPicker';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { SPORT_OPTIONS, SPORT_POSITIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import {
  AgeRange,
  Gender,
  getProfile,
  isUsernameTaken,
  SportPositions,
  updateProfile,
} from '@/services/profile';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/store/useToast';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { setUser } = useAppStore();

  // 基本資料
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // 社群連結
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [lineId, setLineId] = useState('');

  // 運動資料
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [favoriteSports, setFavoriteSports] = useState<string[]>([]);
  const [sportPositions, setSportPositions] = useState<SportPositions>({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getProfile(user.id).then((p) => {
        if (p) {
          setUsername(p.username || '');
          setBio(p.bio || '');
          setInstagramUrl(p.instagram_url || '');
          setFacebookUrl(p.facebook_url || '');
          setLineId(p.line_id || '');
          setGender(p.gender || null);
          setAgeRange(p.age_range || null);
          setRegion(p.region || null);
          setHeight(p.height?.toString() || '');
          setWeight(p.weight?.toString() || '');
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
      });
    }
  }, [user]);

  const validateUsername = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setUsername(clean);
    setUsernameError('');
    if (clean.length > 0 && clean.length < 3) setUsernameError('至少 3 個字元');
    if (clean.length > 20) setUsernameError('最多 20 個字元');
  };

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

    if (username.length > 0 && username.length < 3) {
      Alert.alert('錯誤', '用戶名稱至少 3 個字元');
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

      if (username) {
        const profile = await getProfile(user.id);
        if (profile?.username !== username) {
          const taken = await isUsernameTaken(username);
          if (taken) {
            Alert.alert('錯誤', '此用戶名稱已被使用');
            setSaving(false);
            return;
          }
        }
      }

      await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });

      await updateProfile(user.id, {
        display_name: displayName.trim(),
        username: username || null,
        bio: bio.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        line_id: lineId.trim() || null,
        gender,
        age_range: ageRange,
        region,
        height: h,
        weight: w,
        favorite_sports: favoriteSports,
        sport_positions: sportPositions,
      } as any);

      setUser({ ...user, displayName: displayName.trim() });
      toast.success('個人資料已更新');
      router.back();
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('此用戶名稱已被使用');
      } else {
        toast.error(error.message || '更新失敗');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="編輯個人資料" />

      {/* ===== 基本資料 ===== */}
      <Section title="基本資料" colors={colors}>
        <Field label="顯示名稱" colors={colors}>
          <TextInput
            style={inputStyle}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="輸入您的名稱"
            placeholderTextColor={colors.placeholder}
          />
        </Field>

        <Field label="用戶名稱" colors={colors}>
          <View style={[styles.usernameInput, { borderColor: usernameError ? colors.error : colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.atSign, { color: colors.textSecondary }]}>@</Text>
            <TextInput
              style={[styles.usernameField, { color: colors.text }]}
              value={username}
              onChangeText={validateUsername}
              placeholder="username"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {usernameError ? (
            <ThemedText type="caption" style={{ color: colors.error, marginTop: Spacing.xs }}>
              {usernameError}
            </ThemedText>
          ) : username.length >= 3 ? (
            <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.xs }}>
              @{username}
            </ThemedText>
          ) : null}
        </Field>

        <Field label="自我介紹" colors={colors}>
          <TextInput
            style={[inputStyle, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="簡單介紹自己（選填）"
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={150}
          />
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.xs, textAlign: 'right' }}>
            {bio.length}/150
          </ThemedText>
        </Field>

        <Field label="電子郵件" colors={colors}>
          <ThemedText style={[styles.emailText, { color: colors.textSecondary }]}>
            {user?.email}
          </ThemedText>
        </Field>
      </Section>

      {/* ===== 社群連結 ===== */}
      <Section title="社群連結（選填）" colors={colors}>
        <Field label="Instagram" colors={colors}>
          <TextInput
            style={inputStyle}
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            placeholder="@username 或完整網址"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <Field label="Facebook" colors={colors}>
          <TextInput
            style={inputStyle}
            value={facebookUrl}
            onChangeText={setFacebookUrl}
            placeholder="用戶名 或 完整網址"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <Field label="LINE ID" colors={colors}>
          <TextInput
            style={inputStyle}
            value={lineId}
            onChangeText={setLineId}
            placeholder="LINE ID"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
      </Section>

      {/* ===== 運動資料 ===== */}
      <Section title="運動資料" colors={colors}>
        <Field label="性別" colors={colors}>
          <View style={styles.optionRow}>
            {GENDER_OPTIONS.map((opt) => {
              const selected = gender === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.optionBtn,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => setGender(selected ? null : opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.textSecondary },
                    selected && { color: colors.background },
                  ]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="年齡層" colors={colors}>
          <View style={styles.optionRow}>
            {AGE_OPTIONS.map((opt) => {
              const selected = ageRange === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.optionBtn,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => setAgeRange(selected ? null : opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.textSecondary },
                    selected && { color: colors.background },
                  ]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="活動區域" colors={colors}>
          <RegionPicker value={region} onChange={setRegion} />
        </Field>

        <Field label="身體數據" colors={colors}>
          <View style={styles.rowInput}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              value={height}
              onChangeText={setHeight}
              placeholder="身高 (cm)"
              placeholderTextColor={colors.disabled}
              keyboardType="number-pad"
            />
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="體重 (kg)"
              placeholderTextColor={colors.disabled}
              keyboardType="number-pad"
            />
          </View>
        </Field>

        <Field label="喜好運動（可多選）" colors={colors}>
          <View style={styles.optionRow}>
            {SPORT_OPTIONS.filter((s) => s.key !== 'other').map((sport) => {
              const selected = favoriteSports.includes(sport.key);
              return (
                <TouchableOpacity
                  key={sport.key}
                  style={[
                    styles.optionBtn,
                    { borderColor: colors.border },
                    selected && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  onPress={() => toggleSport(sport.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.textSecondary },
                    selected && { color: colors.background },
                  ]}>{sport.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        {favoriteSports.map((sportKey) => {
          const positions = SPORT_POSITIONS[sportKey];
          if (!positions) return null;
          const sportLabel = SPORT_OPTIONS.find((s) => s.key === sportKey)?.label || sportKey;
          const currentPositions = sportPositions[sportKey as keyof SportPositions] || [];
          return (
            <Field
              key={sportKey}
              label={`${sportLabel} — ${sportKey === 'badminton' ? '偏好（可多選）' : sportKey === 'running' ? '類型（可多選）' : '位置（可多選）'}`}
              colors={colors}
            >
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
                      ]}>{pos.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
          );
        })}
      </Section>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <ThemedText style={{ color: colors.primaryText, fontWeight: '600', fontSize: 16 }}>
          {saving ? '儲存中...' : '儲存'}
        </ThemedText>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, colors, children }: { label: string; colors: any; children: React.ReactNode }) {
  return (
    <View>
      <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  sectionBody: {
    gap: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  usernameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
  },
  atSign: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  usernameField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.md,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  emailText: {
    fontSize: 15,
    paddingVertical: Spacing.md,
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
  saveButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
