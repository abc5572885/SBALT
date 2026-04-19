import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { GROUP_TYPES, GroupType } from '@/constants/groupTypes';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createGroup } from '@/services/groups';
import { AccountType, getProfile, OfficialKind } from '@/services/profile';
import { toast } from '@/store/useToast';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sportType, setSportType] = useState('basketball');
  const [groupType, setGroupType] = useState<GroupType>('casual');
  const [accountType, setAccountType] = useState<AccountType>('regular');
  const [officialKinds, setOfficialKinds] = useState<OfficialKind[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      getProfile(user.id).then((p) => {
        if (p) {
          setAccountType(p.account_type);
          setOfficialKinds(p.official_kinds || []);
        }
      }).catch(() => {});
    }
  }, [user]);

  // 依 official_kinds 決定哪些 group 類型可建
  const canCreateType = (key: GroupType): boolean => {
    if (!GROUP_TYPES.find((t) => t.key === key)?.officialOnly) return true;
    if (accountType !== 'official') return false;
    if (key === 'competition_org') return officialKinds.includes('competition');
    if (key === 'venue_operator') return officialKinds.includes('venue');
    return false;
  };
  const availableTypes = GROUP_TYPES.filter((t) => canCreateType(t.key));
  const lockedTypes = GROUP_TYPES.filter((t) => !canCreateType(t.key) && t.officialOnly);

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('請輸入群組名稱');
      return;
    }

    try {
      setLoading(true);
      const group = await createGroup({
        name: name.trim(),
        description: description.trim() || null,
        sport_type: sportType,
        type: groupType,
        creator_id: user.id,
      });
      toast.success(`群組「${group.name}」已建立`);
      router.back();
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '建立失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader title="建立群組" />
      <View style={styles.form}>
        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            群組類型
          </ThemedText>
          <View style={styles.typeList}>
            {availableTypes.map((t) => {
              const selected = groupType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeCard,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    selected && { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
                  ]}
                  onPress={() => setGroupType(t.key)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.typeLabel, selected && { color: colors.primary, fontWeight: '700' as const }]}>
                    {t.label}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {t.description}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
            {lockedTypes.map((t) => (
              <View key={t.key} style={[styles.typeCard, styles.typeCardDisabled, { borderColor: colors.border }]}>
                <ThemedText style={[styles.typeLabel, { color: colors.disabled }]}>
                  {t.label}
                </ThemedText>
                <ThemedText type="caption" style={{ color: colors.disabled }}>
                  僅限官方帳號 · {t.description}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            群組名稱 *
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="例如：竹北週五籃球"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            描述
          </ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="群組簡介（選填）"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
          />
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            運動類型
          </ThemedText>
          <View style={styles.sportOptions}>
            {SPORT_OPTIONS.filter((s) => s.key !== 'other').map((sport) => (
              <TouchableOpacity
                key={sport.key}
                style={[
                  styles.sportOption,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  sportType === sport.key && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setSportType(sport.key)}
                activeOpacity={0.6}
              >
                <ThemedText
                  style={[
                    styles.sportOptionText,
                    sportType === sport.key && { color: colors.primary, fontWeight: '600' as const },
                  ]}
                >
                  {sport.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}
          onPress={() => router.back()}
          activeOpacity={0.6}
        >
          <ThemedText style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 15 }}>取消</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, Shadows.sm, loading && { opacity: 0.5 }]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.7}
        >
          <ThemedText style={{ color: colors.primaryText, fontWeight: '600', fontSize: 15 }}>
            {loading ? '建立中...' : '建立群組'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.xl,
    marginBottom: Spacing.xxl,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeList: {
    gap: Spacing.sm,
  },
  typeCard: {
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  typeCardDisabled: {
    opacity: 0.5,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  sportOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sportOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  sportOptionText: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
});
