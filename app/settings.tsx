import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeMode, useAppStore } from '@/store/useAppStore';
import React from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const {
    themeMode,
    notificationPreferences,
    setThemeMode,
    setNotificationPreferences,
  } = useAppStore();

  const themeOptions: { label: string; value: ThemeMode }[] = [
    { label: '淺色', value: 'light' },
    { label: '深色', value: 'dark' },
    { label: '自動', value: 'auto' },
  ];

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          設定
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            主題
          </ThemedText>
          <View style={styles.options}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  themeMode === option.value && styles.optionSelected,
                ]}
                onPress={() => setThemeMode(option.value)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    themeMode === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            通知偏好
          </ThemedText>

          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>比賽開始通知</ThemedText>
            <Switch
              value={notificationPreferences.gameStart}
              onValueChange={(value) =>
                setNotificationPreferences({ gameStart: value })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>比分更新通知</ThemedText>
            <Switch
              value={notificationPreferences.scoreUpdate}
              onValueChange={(value) =>
                setNotificationPreferences({ scoreUpdate: value })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>留言回覆通知</ThemedText>
            <Switch
              value={notificationPreferences.commentReply}
              onValueChange={(value) =>
                setNotificationPreferences({ commentReply: value })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>活動提醒</ThemedText>
            <Switch
              value={notificationPreferences.eventReminder}
              onValueChange={(value) =>
                setNotificationPreferences({ eventReminder: value })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <ThemedText style={styles.switchLabel}>新聞更新</ThemedText>
            <Switch
              value={notificationPreferences.newsUpdate}
              onValueChange={(value) =>
                setNotificationPreferences({ newsUpdate: value })
              }
            />
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
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
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  switchLabel: {
    fontSize: 16,
  },
});

