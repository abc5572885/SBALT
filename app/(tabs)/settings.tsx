import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { SwitchRow } from '@/components/SwitchRow';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeMode, useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    themeMode,
    notificationPreferences,
    setThemeMode,
    setNotificationPreferences,
  } = useAppStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          隱私與安全
        </ThemedText>
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
