import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLiveGames, getTodayGames } from '@/services/scoreApi';
import { Game } from '@/types/database';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [liveGames, setLiveGames] = React.useState<Game[]>([]);
  const [todayGames, setTodayGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(false);
      const [live, today] = await Promise.all([
        getLiveGames(),
        getTodayGames(),
      ]);
      setLiveGames(live);
      setTodayGames(today);
    } catch (err) {
      console.error('載入資料失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.lg }}>
            載入失敗，請檢查網路連線
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); loadData(); }}
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
        <PageHeader title="SBALT" showBack={false} />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/(tabs)/event/new')}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={20} color={colors.primary} />
              <ThemedText style={styles.actionText}>舉辦活動</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push('/(tabs)/scores')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
              <ThemedText style={styles.actionText}>查看比分</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Live Games */}
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
                {liveGames.slice(0, 3).map((item) => (
                  <View key={item.id} style={{ width: 280, marginRight: Spacing.md }}>
                    <ScoreCard game={item} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Today's Games */}
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
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
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
