import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getLiveGames, getTodayGames } from '@/services/scoreApi';
import { Game } from '@/types/database';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const [liveGames, setLiveGames] = React.useState<Game[]>([]);
  const [todayGames, setTodayGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [live, today] = await Promise.all([
        getLiveGames(),
        getTodayGames(),
      ]);
      setLiveGames(live);
      setTodayGames(today);
    } catch (error) {
      console.error('載入資料失敗:', error);
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
        <PageHeader title="SPALT" showBack={false} />
        <ThemedText style={styles.subtitle}>運動與球類主題應用</ThemedText>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/event/new')}
        >
          <ThemedText style={styles.actionText}>⚽ 舉辦活動</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/scores')}
        >
          <ThemedText style={styles.actionText}>📊 查看比分</ThemedText>
        </TouchableOpacity>
      </View>

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
            {liveGames.slice(0, 3).map((item) => (
              <ScoreCard key={item.id} game={item} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          今日比賽
        </ThemedText>
        {todayGames.length > 0 ? (
          <View>
            {todayGames.slice(0, 5).map((item) => (
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
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 16,
    // fontWeight is handled by ThemedText component (set to 600)
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
