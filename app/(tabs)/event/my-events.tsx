import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteEvent, getEvents } from '@/services/database';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MyEventsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  // 當頁面獲得焦點時自動刷新（例如從建立活動頁面返回時）
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadEvents();
      }
    }, [user])
  );

  const loadEvents = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // excludeInstances: true 只顯示母活動，不顯示重複活動的實例
      const myEvents = await getEvents({ organizerId: user.id, excludeInstances: true });
      setEvents(myEvents);
    } catch (error) {
      console.error('載入活動失敗:', error);
      Alert.alert('錯誤', '無法載入活動列表');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleDelete = (event: Event) => {
    Alert.alert(
      '刪除活動',
      `確定要刪除「${event.title}」嗎？此操作無法復原。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              Alert.alert('成功', '活動已刪除');
              loadEvents();
            } catch (error: any) {
              console.error('刪除活動失敗:', error);
              Alert.alert('錯誤', error.message || '刪除活動失敗');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (event: Event) => {
    router.push(`/(tabs)/event/${event.id}`);
  };

  if (authLoading || loading) {
    return (
      <ScreenLayout>
        <PageHeader title="我的活動" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText style={styles.loadingText}>載入中...</ThemedText>
        </ThemedView>
      </ScreenLayout>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <ScreenLayout scrollable>
      <PageHeader title="我的活動" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {events.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>您尚未建立任何活動</ThemedText>
            <TouchableOpacity
              style={[
                styles.createButton,
                colorScheme === 'dark' ? styles.createButtonDark : styles.createButtonLight,
              ]}
              onPress={() => router.push('/(tabs)/event/new')}
            >
              <ThemedText style={styles.createButtonText}>➕ 建立第一個活動</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event) => (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  colorScheme === 'dark' ? styles.eventCardDark : styles.eventCardLight,
                ]}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
                    <ThemedText style={styles.eventDate}>
                      {formatDateChinese(new Date(event.scheduled_at))}
                    </ThemedText>
                    <ThemedText style={styles.eventLocation}>📍 {event.location}</ThemedText>
                  </View>
                  <View style={styles.statusBadge}>
                    <ThemedText
                      style={[
                        styles.statusText,
                        event.status === 'open' && { color: Colors[colorScheme ?? 'light'].statusSuccess },
                        event.status === 'closed' && { color: Colors[colorScheme ?? 'light'].statusSecondary },
                        event.status === 'cancelled' && { color: Colors[colorScheme ?? 'light'].error },
                      ]}
                    >
                      {event.status === 'open'
                        ? '開放報名'
                        : event.status === 'closed'
                        ? '已截止'
                        : event.status === 'cancelled'
                        ? '已取消'
                        : event.status === 'finished'
                        ? '已結束'
                        : '草稿'}
                    </ThemedText>
                  </View>
                </View>

                {event.description && (
                  <ThemedText style={styles.eventDescription} numberOfLines={2}>
                    {event.description}
                  </ThemedText>
                )}

                <View style={styles.eventFooter}>
                  <ThemedText style={styles.eventMeta}>
                    人數上限：{event.quota} 人 | 費用：NT$ {event.fee}
                  </ThemedText>
                  {event.recurrence_rule && (
                    <ThemedText style={[styles.recurrenceBadge, { color: Colors[colorScheme ?? 'light'].primary }]}>🔄 重複活動</ThemedText>
                  )}
                </View>

                <View style={[styles.actionButtons, { borderTopColor: Colors[colorScheme ?? 'light'].border }]}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                    onPress={() => handleEdit(event)}
                  >
                    <ThemedText style={[styles.actionButtonText, { color: Colors[colorScheme ?? 'light'].primaryText }]}>編輯</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}
                    onPress={() => handleDelete(event)}
                  >
                    <ThemedText style={[styles.actionButtonText, { color: Colors[colorScheme ?? 'light'].primaryText }]}>刪除</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  createButtonLight: {
    backgroundColor: Colors.light.primary,
  },
  createButtonDark: {
    backgroundColor: Colors.dark.primary,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventsList: {
    gap: 16,
    paddingBottom: 16,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  eventCardLight: {
    backgroundColor: Colors.light.card,
  },
  eventCardDark: {
    backgroundColor: Colors.dark.card,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  eventLocation: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  eventMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  recurrenceBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

