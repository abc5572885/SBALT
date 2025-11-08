import { EventForm } from '@/components/EventForm';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types/database';
import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet } from 'react-native';

export default function NewEventScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  if (loading) {
    return null; // Or return a loading skeleton
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const handleSubmit = async (data: Partial<Event>) => {
    if (!user) return;

    try {
      // TODO: 呼叫 Supabase API 建立活動
      console.log('建立活動:', data);
      Alert.alert('成功', '活動已建立', [
        { text: '確定', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('建立活動失敗:', error);
      Alert.alert('錯誤', '建立活動失敗，請稍後再試');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <EventForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

