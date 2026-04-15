import { EventForm } from '@/components/EventForm';
import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEventById, updateEvent } from '@/services/database';
import { Event } from '@/types/database';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadEvent();
    }
  }, [id, user]);

  const loadEvent = async () => {
    try {
      setError(false);
      const eventData = await getEventById(id);
      setEvent(eventData);
    } catch (err) {
      console.error('載入活動失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <ScreenLayout>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (error || !event) {
    return (
      <ScreenLayout>
        <PageHeader title="編輯活動" />
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>
            {error ? '載入活動失敗' : '找不到此活動'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); loadEvent(); }}
          >
            <ThemedText style={[styles.retryText, { color: colors.primaryText }]}>重試</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScreenLayout>
    );
  }

  // Only the organizer can edit
  if (event.organizer_id !== user.id) {
    return (
      <ScreenLayout>
        <PageHeader title="編輯活動" />
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>您沒有權限編輯此活動</ThemedText>
        </ThemedView>
      </ScreenLayout>
    );
  }

  const handleSubmit = async (
    data: Partial<Event> & {
      recurrence_rule?: string | null;
      recurrence_end_date?: string | null;
      recurrence_count?: number | null;
    }
  ) => {
    try {
      setSaving(true);

      await updateEvent(event.id, {
        title: data.title,
        description: data.description,
        scheduled_at: data.scheduled_at,
        location: data.location,
        quota: data.quota,
        fee: data.fee,
      });

      Alert.alert('成功', '活動已更新', [
        { text: '確定', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('更新活動失敗:', err);
      Alert.alert('錯誤', err?.message || '更新活動失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    router.back();
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader title="編輯活動" />
      <EventForm
        event={event}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={saving}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
