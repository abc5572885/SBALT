import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Event } from '@/types/database';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface EventFormProps {
  event?: Event;
  onSubmit: (data: Partial<Event>) => void;
  onCancel: () => void;
}

export function EventForm({ event, onSubmit, onCancel }: EventFormProps) {
  const [title, setTitle] = React.useState(event?.title || '');
  const [description, setDescription] = React.useState(event?.description || '');
  const [location, setLocation] = React.useState(event?.location || '');
  const [quota, setQuota] = React.useState(event?.quota?.toString() || '');
  const [fee, setFee] = React.useState(event?.fee?.toString() || '0');

  const handleSubmit = () => {
    onSubmit({
      title,
      description: description || null,
      location,
      quota: parseInt(quota, 10) || 0,
      fee: parseFloat(fee) || 0,
      scheduled_at: event?.scheduled_at || new Date().toISOString(),
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {event ? '編輯活動' : '建立活動'}
      </ThemedText>

      <View style={styles.form}>
        <ThemedText style={styles.label}>活動標題 *</ThemedText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="輸入活動標題"
          placeholderTextColor="#999"
        />

        <ThemedText style={styles.label}>活動描述</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="輸入活動描述"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />

        <ThemedText style={styles.label}>地點 *</ThemedText>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="輸入活動地點"
          placeholderTextColor="#999"
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <ThemedText style={styles.label}>人數上限 *</ThemedText>
            <TextInput
              style={styles.input}
              value={quota}
              onChangeText={setQuota}
              placeholder="例如：20"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.halfWidth}>
            <ThemedText style={styles.label}>費用 (NT$)</ThemedText>
            <TextInput
              style={styles.input}
              value={fee}
              onChangeText={setFee}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {/* TODO: 加入日期時間選擇器 */}
      {/* TODO: 加入表單欄位設計器（form_schema） */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
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
});

