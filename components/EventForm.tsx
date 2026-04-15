import { DateTimePickerButton } from '@/components/DateTimePickerButton';
import { RecurrenceSelector } from '@/components/RecurrenceSelector';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Event } from '@/types/database';
import React from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface EventFormProps {
  event?: Event;
  onSubmit: (data: Partial<Event> & { recurrence_rule?: string | null; recurrence_end_date?: string | null; recurrence_count?: number | null }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function EventForm({ event, onSubmit, onCancel, loading = false }: EventFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [title, setTitle] = React.useState(event?.title || '');
  const [description, setDescription] = React.useState(event?.description || '');
  const [location, setLocation] = React.useState(event?.location || '');
  const [quota, setQuota] = React.useState(event?.quota?.toString() || '');
  const [fee, setFee] = React.useState(event?.fee?.toString() || '0');
  const [recurrenceRule, setRecurrenceRule] = React.useState<string | null>(null);
  const [recurrenceEndDate, setRecurrenceEndDate] = React.useState<Date | null>(null);
  const [recurrenceCount, setRecurrenceCount] = React.useState<number | null>(null);
  
  // Use Date object for scheduled_at
  const [scheduledAt, setScheduledAt] = React.useState<Date>(
    event?.scheduled_at
      ? new Date(event.scheduled_at)
      : (() => {
          const defaultDate = new Date();
          defaultDate.setHours(14, 0, 0, 0); // Default to 2 PM today
          if (defaultDate <= new Date()) {
            defaultDate.setDate(defaultDate.getDate() + 1); // If past, set to tomorrow
          }
          return defaultDate;
        })()
  );
  
  const handleDateChange = (date: Date) => {
    // Preserve time when changing date
    const newDate = new Date(date);
    newDate.setHours(scheduledAt.getHours(), scheduledAt.getMinutes(), 0, 0);
    setScheduledAt(newDate);
  };

  const handleTimeChange = (date: Date) => {
    // Preserve date when changing time
    const newDate = new Date(scheduledAt);
    newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setScheduledAt(newDate);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('驗證失敗', '請輸入活動標題');
      return false;
    }
    if (!location.trim()) {
      Alert.alert('驗證失敗', '請輸入活動地點');
      return false;
    }
    const quotaNum = parseInt(quota, 10);
    if (!quotaNum || quotaNum <= 0) {
      Alert.alert('驗證失敗', '請輸入有效的人數上限（必須大於 0）');
      return false;
    }
    if (scheduledAt <= new Date()) {
      Alert.alert('驗證失敗', '活動時間必須是未來時間');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim(),
      quota: parseInt(quota, 10),
      fee: parseFloat(fee) || 0,
      scheduled_at: scheduledAt.toISOString(),
      recurrence_rule: recurrenceRule,
      recurrence_end_date: recurrenceEndDate ? recurrenceEndDate.toISOString() : null,
      recurrence_count: recurrenceCount,
    });
  };

  const handleRecurrenceChange = (rrule: string | null, endDate: Date | null, count?: number | null) => {
    setRecurrenceRule(rrule);
    setRecurrenceEndDate(endDate);
    setRecurrenceCount(count || null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
          <ThemedText style={styles.label}>活動標題 *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="輸入活動標題"
            placeholderTextColor={colors.placeholder}
            editable={!loading}
          />

          <ThemedText style={styles.label}>活動描述</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="輸入活動描述（選填）"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            editable={!loading}
          />

          <ThemedText style={styles.label}>活動日期 *</ThemedText>
          <DateTimePickerButton
            value={scheduledAt}
            onChange={handleDateChange}
            mode="date"
            minimumDate={new Date()}
            disabled={loading}
          />

          <ThemedText style={styles.label}>活動時間 *</ThemedText>
          <DateTimePickerButton
            value={scheduledAt}
            onChange={handleTimeChange}
            mode="time"
            disabled={loading}
          />

          <ThemedText style={styles.label}>地點 *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
            value={location}
            onChangeText={setLocation}
            placeholder="輸入活動地點"
            placeholderTextColor={colors.placeholder}
            editable={!loading}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <ThemedText style={styles.label}>人數上限 *</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                value={quota}
                onChangeText={setQuota}
                placeholder="例如：20"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            <View style={styles.halfWidth}>
              <ThemedText style={styles.label}>費用 (NT$)</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                value={fee}
                onChangeText={setFee}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>

          <RecurrenceSelector
            initialDate={scheduledAt}
            onRecurrenceChange={handleRecurrenceChange}
            disabled={loading}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.card }]}
            onPress={onCancel}
            disabled={loading}
          >
            <ThemedText style={[styles.cancelButtonText, { color: colors.icon }]}>取消</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { backgroundColor: colors.disabled }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <ThemedText style={[styles.submitButtonText, { color: colors.primaryText }]}>
              {loading ? '建立中...' : event ? '更新' : '建立活動'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

