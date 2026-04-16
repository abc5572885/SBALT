import { DateTimePickerButton } from '@/components/DateTimePickerButton';
import { RecurrenceSelector } from '@/components/RecurrenceSelector';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
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

  const [scheduledAt, setScheduledAt] = React.useState<Date>(
    event?.scheduled_at
      ? new Date(event.scheduled_at)
      : (() => {
          const defaultDate = new Date();
          defaultDate.setHours(14, 0, 0, 0);
          if (defaultDate <= new Date()) {
            defaultDate.setDate(defaultDate.getDate() + 1);
          }
          return defaultDate;
        })()
  );

  const handleDateChange = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(scheduledAt.getHours(), scheduledAt.getMinutes(), 0, 0);
    setScheduledAt(newDate);
  };

  const handleTimeChange = (date: Date) => {
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
    if (!validateForm()) return;

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

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            活動標題 *
          </ThemedText>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="輸入活動標題"
            placeholderTextColor={colors.placeholder}
            editable={!loading}
          />
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            活動描述
          </ThemedText>
          <TextInput
            style={[...inputStyle, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="輸入活動描述（選填）"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            活動日期 *
          </ThemedText>
          <DateTimePickerButton
            value={scheduledAt}
            onChange={handleDateChange}
            mode="date"
            minimumDate={new Date()}
            disabled={loading}
          />
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            活動時間 *
          </ThemedText>
          <DateTimePickerButton
            value={scheduledAt}
            onChange={handleTimeChange}
            mode="time"
            disabled={loading}
          />
        </View>

        <View>
          <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
            地點 *
          </ThemedText>
          <TextInput
            style={inputStyle}
            value={location}
            onChangeText={setLocation}
            placeholder="輸入活動地點"
            placeholderTextColor={colors.placeholder}
            editable={!loading}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
              人數上限 *
            </ThemedText>
            <TextInput
              style={inputStyle}
              value={quota}
              onChangeText={setQuota}
              placeholder="例如：20"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={styles.halfWidth}>
            <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
              費用 (NT$)
            </ThemedText>
            <TextInput
              style={inputStyle}
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
          style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}
          onPress={onCancel}
          disabled={loading}
          activeOpacity={0.6}
        >
          <ThemedText style={[styles.buttonText, { color: colors.textSecondary }]}>取消</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, Shadows.sm, loading && { backgroundColor: colors.disabled }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.buttonText, { color: colors.primaryText }]}>
            {loading ? '建立中...' : event ? '更新' : '建立活動'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.lg,
  },
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
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
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
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
