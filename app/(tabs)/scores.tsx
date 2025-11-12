import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getLiveGames, getTodayGames } from '@/services/scoreApi';
import { Game } from '@/types/database';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScoresScreen() {
  const [games, setGames] = React.useState<Game[]>([]);
  const [liveGames, setLiveGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadGames = async () => {
    try {
      const [todayGames, live] = await Promise.all([
        getTodayGames(),
        getLiveGames(),
      ]);
      setGames(todayGames);
      setLiveGames(live);
    } catch (error) {
      console.error('載入比賽失敗:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadGames();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadGames();
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
        <PageHeader title="比分" showBack={false} />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {liveGames.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🔴 即時比分
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {liveGames.map((item) => (
              <ScoreCard key={item.id} game={item} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          今日比賽
        </ThemedText>
        {games.length > 0 ? (
          <View>
            {games.map((item) => (
              <ScoreCard key={item.id} game={item} />
            ))}
          </View>
        ) : (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>今日尚無比賽</ThemedText>
          </ThemedView>
        )}
      </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  horizontalList: {
    paddingRight: 16,
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

