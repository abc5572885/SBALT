import { EventForm } from '@/components/EventForm';
import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createEvent } from '@/services/database';
import { Event } from '@/types/database';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';

export default function NewEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    templateTitle?: string;
    templateDescription?: string;
    templateLocation?: string;
    templateQuota?: string;
    templateFee?: string;
    templateSportType?: string;
    groupId?: string;
  }>();
  const colorScheme = useColorScheme();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <ScreenLayout>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const handleSubmit = async (
    data: Partial<Event> & { recurrence_rule?: string | null; recurrence_end_date?: string | null; recurrence_count?: number | null }
  ) => {
    if (!user) return;

    try {
      setLoading(true);

      const eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'> & {
        recurrence_rule?: string | null;
        recurrence_end_date?: string | null;
        recurrence_count?: number | null;
      } = {
        title: data.title!,
        description: data.description || null,
        organizer_id: user.id,
        scheduled_at: data.scheduled_at!,
        location: data.location!,
        quota: data.quota!,
        fee: data.fee || 0,
        status: 'open',
        form_schema: null,
        recurrence_rule: data.recurrence_rule || null,
        recurrence_end_date: data.recurrence_end_date || null,
        recurrence_count: data.recurrence_count || null,
        parent_event_id: null,
        is_recurring_instance: null,
        sport_type: data.sport_type || 'other',
        group_id: params.groupId || null,
      } as any;

      const newEvent = await createEvent(eventData);

      console.log('✅ 活動建立成功:', newEvent.id);

      const message = data.recurrence_rule
        ? '重複活動已建立，系統已自動生成所有活動實例'
        : '活動已建立';

      Alert.alert('成功', message, [
        {
          text: '確定',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('❌ 建立活動失敗:', error);

      const errorMessage = getErrorMessage(error);
      Alert.alert('錯誤', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
      if ('code' in error) {
        if (error.code === '23505') {
          return '活動已存在，請檢查輸入資料';
        }
        if (error.code === '23503') {
          return '無效的用戶資料，請重新登入';
        }
      }
    }
    return '建立活動失敗，請稍後再試';
  };

  const handleCancel = () => {
    if (loading) return;
    router.back();
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader title="建立活動" />
      <EventForm
        event={params.templateTitle ? {
          title: params.templateTitle,
          description: params.templateDescription || null,
          location: params.templateLocation || '',
          quota: parseInt(params.templateQuota || '20', 10),
          fee: parseFloat(params.templateFee || '0'),
          sport_type: params.templateSportType || 'other',
        } as any : undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

