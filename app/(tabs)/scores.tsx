import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLiveGames, getTodayGames } from '@/services/scoreApi';
import { Game } from '@/types/database';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScoresScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [games, setGames] = React.useState<Game[]>([]);
  const [liveGames, setLiveGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);

  const loadGames = async () => {
    try {
      setError(false);
      const [todayGames, live] = await Promise.all([
        getTodayGames(),
        getLiveGames(),
      ]);
      setGames(todayGames);
      setLiveGames(live);
    } catch (err) {
      console.error('載入比賽失敗:', err);
      setError(true);
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
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
            載入中...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error && games.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.lg }}>
            載入失敗，請檢查網路連線
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); loadGames(); }}
          >
            <ThemedText style={{ color: colors.primaryText, fontWeight: '600' }}>重試</ThemedText>
          </TouchableOpacity>
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
              <View style={styles.sectionHeader}>
                <View style={[styles.liveDot, { backgroundColor: colors.error }]} />
                <ThemedText type="subtitle">即時比分</ThemedText>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {liveGames.map((item) => (
                  <View key={item.id} style={{ width: 280, marginRight: Spacing.md }}>
                    <ScoreCard game={item} />
                  </View>
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
              <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  今日尚無比賽
                </ThemedText>
              </View>
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
    paddingHorizontal: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  horizontalList: {
    paddingRight: Spacing.lg,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
});
