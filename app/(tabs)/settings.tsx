import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { SwitchRow } from '@/components/SwitchRow';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeMode, useAppStore } from '@/store/useAppStore';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const {
    themeMode,
    notificationPreferences,
    setThemeMode,
    setNotificationPreferences,
  } = useAppStore();
  const colorScheme = useColorScheme();

  const themeOptions: { label: string; value: ThemeMode }[] = [
    { label: '淺色', value: 'light' },
    { label: '深色', value: 'dark' },
    { label: '自動', value: 'auto' },
  ];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="設定" />
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
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
                      colorScheme === 'dark' ? styles.optionDark : styles.optionLight,
                      isSelected && { backgroundColor: Colors[colorScheme ?? 'light'].primary },
                    ]}
                    onPress={() => setThemeMode(option.value)}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        isSelected && { color: Colors[colorScheme ?? 'light'].primaryText, fontWeight: '600' as const },
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
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              通知偏好
            </ThemedText>

            <SwitchRow
              label="比賽開始通知"
              value={notificationPreferences.gameStart}
              onValueChange={(value) =>
                setNotificationPreferences({ gameStart: value })
              }
            />

            <SwitchRow
              label="比分更新通知"
              value={notificationPreferences.scoreUpdate}
              onValueChange={(value) =>
                setNotificationPreferences({ scoreUpdate: value })
              }
            />

            <SwitchRow
              label="留言回覆通知"
              value={notificationPreferences.commentReply}
              onValueChange={(value) =>
                setNotificationPreferences({ commentReply: value })
              }
            />

            <SwitchRow
              label="活動提醒"
              value={notificationPreferences.eventReminder}
              onValueChange={(value) =>
                setNotificationPreferences({ eventReminder: value })
              }
            />

            <SwitchRow
              label="新聞更新"
              value={notificationPreferences.newsUpdate}
              onValueChange={(value) =>
                setNotificationPreferences({ newsUpdate: value })
              }
            />
          </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
  },
  options: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionLight: {
    backgroundColor: Colors.light.card,
  },
  optionDark: {
    backgroundColor: Colors.dark.card,
  },
  optionText: {
    fontSize: 14,
  },
});

