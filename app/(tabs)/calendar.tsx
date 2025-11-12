import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getAllGames } from '@/services/scoreApi';
import { Game } from '@/types/database';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalendarScreen() {
  const [games, setGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  React.useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const allGames = await getAllGames(1, 50);
      // 過濾出選定日期的比賽
      const filtered = allGames.filter((game) => {
        const gameDate = new Date(game.scheduled_at);
        return (
          gameDate.getDate() === selectedDate.getDate() &&
          gameDate.getMonth() === selectedDate.getMonth() &&
          gameDate.getFullYear() === selectedDate.getFullYear()
        );
      });
      setGames(filtered);
    } catch (error) {
      console.error('載入比賽失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>載入中...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <PageHeader title="賽事日曆" showBack={false} />
        <ThemedText style={styles.subtitle}>
          {selectedDate.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </ThemedText>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* TODO: 加入日曆元件讓用戶選擇日期 */}

          {games.length > 0 ? (
            <View style={styles.list}>
              {games.map((item) => (
                <ScoreCard key={item.id} game={item} />
              ))}
            </View>
          ) : (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>當日尚無比賽</ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
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
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  list: {
    paddingBottom: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.5,
  },
});

