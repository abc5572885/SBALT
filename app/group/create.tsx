import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createGroup } from '@/services/groups';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sportType, setSportType] = useState('basketball');
  const [loading, setLoading] = useState(false);

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
        creator_id: user.id,
      });
      Alert.alert('建立成功', `群組「${group.name}」已建立`, [
        { text: '確定', onPress: () => router.back() },
      ]);
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
