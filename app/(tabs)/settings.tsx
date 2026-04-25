import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { SwitchRow } from '@/components/SwitchRow';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isHealthKitAvailable, requestHealthKitAuthorization, syncRunningWorkouts } from '@/services/healthKit';
import { TaggingPrivacy, getProfile, updateProfile } from '@/services/profile';
import { ThemeMode, useAppStore } from '@/store/useAppStore';
import { toast } from '@/store/useToast';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    themeMode,
    notificationPreferences,
    setThemeMode,
    setNotificationPreferences,
  } = useAppStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [taggingPrivacy, setTaggingPrivacy] = useState<TaggingPrivacy>('approval_required');
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [syncingHealth, setSyncingHealth] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => {
      const v = p?.tagging_privacy;
      if (v === 'public' || v === 'approval_required') setTaggingPrivacy(v);
    });
  }, [user]);

  const handleTaggingPrivacy = async (value: TaggingPrivacy) => {
    if (!user || value === taggingPrivacy) return;
    const prev = taggingPrivacy;
    setTaggingPrivacy(value);
    setSavingPrivacy(true);
    try {
      await updateProfile(user.id, { tagging_privacy: value });
    } catch (e: any) {
      setTaggingPrivacy(prev);
      toast.error(e.message || '更新失敗');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleSyncHealth = async () => {
    if (!user || syncingHealth) return;
    if (!isHealthKitAvailable()) {
      toast.error('Apple Health 僅支援 iOS');
      return;
    }
    setSyncingHealth(true);
    try {
      const authorized = await requestHealthKitAuthorization();
      if (!authorized) {
        toast.error('未取得 Apple Health 授權');
        return;
      }
      const result = await syncRunningWorkouts(user.id, 30);
      if (result.total === 0) {
        toast.success('近 30 天沒有跑步紀錄');
      } else {
        toast.success(`同步完成：新增 ${result.inserted} 筆，已存在 ${result.skipped} 筆`);
      }
    } catch (e: any) {
      toast.error(e.message || '同步失敗');
    } finally {
      setSyncingHealth(false);
    }
  };

  const taggingOptions: { label: string; value: TaggingPrivacy }[] = [
    { label: '需我同意', value: 'approval_required' },
    { label: '直接標記', value: 'public' },
  ];

  const themeOptions: { label: string; value: ThemeMode }[] = [
    { label: '淺色', value: 'light' },
    { label: '深色', value: 'dark' },
    { label: '自動', value: 'auto' },
  ];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="設定" />
      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          主題
        </ThemedText>
        <View style={styles.options}>
          {themeOptions.map((option) => {
            const isSelected = themeMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setThemeMode(option.value)}
                activeOpacity={0.6}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    isSelected && { color: colors.primaryText, fontWeight: '600' as const },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          通知偏好
        </ThemedText>

        <SwitchRow
          label="比賽開始通知"
          value={notificationPreferences.gameStart}
          onValueChange={(value) => setNotificationPreferences({ gameStart: value })}
        />
        <SwitchRow
          label="比分更新通知"
          value={notificationPreferences.scoreUpdate}
          onValueChange={(value) => setNotificationPreferences({ scoreUpdate: value })}
        />
        <SwitchRow
          label="留言回覆通知"
          value={notificationPreferences.commentReply}
          onValueChange={(value) => setNotificationPreferences({ commentReply: value })}
        />
        <SwitchRow
          label="活動提醒"
          value={notificationPreferences.eventReminder}
          onValueChange={(value) => setNotificationPreferences({ eventReminder: value })}
        />
        <SwitchRow
          label="新聞更新"
          value={notificationPreferences.newsUpdate}
          onValueChange={(value) => setNotificationPreferences({ newsUpdate: value })}
        />
      </View>

      {Platform.OS === 'ios' && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            運動資料整合
          </ThemedText>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm, syncingHealth && { opacity: 0.6 }]}
            onPress={handleSyncHealth}
            disabled={syncingHealth}
            activeOpacity={0.6}
          >
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.menuText}>連結 Apple Health</ThemedText>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                匯入近 30 天跑步紀錄（Apple Watch / Nike Run / Strava 都會回流）
              </Text>
            </View>
            {syncingHealth ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          隱私與安全
        </ThemedText>

        <ThemedText type="caption" style={{ color: colors.textSecondary, marginBottom: Spacing.sm }}>
          被標記在打卡紀錄
        </ThemedText>
        <View style={[styles.options, { marginBottom: Spacing.lg }]}>
          {taggingOptions.map((option) => {
            const isSelected = taggingPrivacy === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  savingPrivacy && { opacity: 0.6 },
                ]}
                onPress={() => handleTaggingPrivacy(option.value)}
                disabled={savingPrivacy}
                activeOpacity={0.6}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    isSelected && { color: colors.primaryText, fontWeight: '600' as const },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
          onPress={() => router.push('/blocked-users')}
          activeOpacity={0.6}
        >
          <ThemedText style={styles.menuText}>封鎖的用戶</ThemedText>
          <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  options: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
