import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { setUser } = useAppStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      setUser({ ...user, displayName: displayName.trim() });
      Alert.alert('儲存成功', '個人資料已更新', [
        { text: '確定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader title="編輯個人資料" />

      <View style={styles.form}>
        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            顯示名稱
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="輸入您的名稱"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            電子郵件
          </ThemedText>
          <ThemedText style={[styles.emailText, { color: colors.textSecondary }]}>
            {user?.email}
          </ThemedText>
        </View>
      </View>

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
  emailText: {
    fontSize: 15,
    paddingVertical: Spacing.md,
  },
  saveButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
});
