import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { getProfile, isUsernameTaken, updateProfile } from '@/services/profile';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { setUser } = useAppStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getProfile(user.id).then((p) => {
        if (p) {
          setUsername(p.username || '');
          setBio(p.bio || '');
        }
      });
    }
  }, [user]);

  const validateUsername = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setUsername(clean);
    setUsernameError('');

    if (clean.length > 0 && clean.length < 3) {
      setUsernameError('至少 3 個字元');
    }
    if (clean.length > 20) {
      setUsernameError('最多 20 個字元');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate username
    if (username.length > 0 && username.length < 3) {
      Alert.alert('錯誤', '用戶名稱至少 3 個字元');
      return;
    }

    try {
      setSaving(true);

      // Check username availability
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

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });

      // Update profile
      await updateProfile(user.id, {
        display_name: displayName.trim(),
        username: username || null,
        bio: bio.trim() || null,
      });

      setUser({ ...user, displayName: displayName.trim() });
      Alert.alert('儲存成功', '個人資料已更新', [
        { text: '確定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error?.code === '23505') {
        Alert.alert('錯誤', '此用戶名稱已被使用');
      } else {
        Alert.alert('錯誤', error.message || '更新失敗');
      }
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
            用戶名稱
          </ThemedText>
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
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            自我介紹
          </ThemedText>
          <TextInput
            style={[styles.input, styles.bioInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
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
  saveButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
});
