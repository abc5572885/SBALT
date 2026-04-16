import { CommentInput } from '@/components/CommentInput';
import { CommentList } from '@/components/CommentList';
import { LikeButton } from '@/components/LikeButton';
import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getComments } from '@/services/database';
import { getGameById } from '@/services/scoreApi';
import { Comment, Game } from '@/types/database';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [game, setGame] = React.useState<Game | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (id) {
      loadGame();
      loadComments();
    }
  }, [id]);

  const loadGame = async () => {
    try {
      setError(false);
      const gameData = await getGameById(id);
      setGame(gameData);
    } catch (err) {
      console.error('載入比賽失敗:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const commentsData = await getComments('game', id);
      setComments(commentsData);
    } catch (err) {
      console.error('載入留言失敗:', err);
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

  if (error || !game) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <PageHeader title="比賽詳情" />
          <ThemedView style={styles.centerContainer}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: Spacing.lg }}>
              {error ? '載入失敗，請檢查網路連線' : '找不到此比賽'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => { setLoading(true); loadGame(); }}
            >
              <ThemedText style={{ color: colors.primaryText, fontWeight: '600' }}>重試</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <PageHeader title="比賽詳情" />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <ScoreCard game={game} />

            <View style={styles.actions}>
              <LikeButton entityId={game.id} entityType="game" />
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                詳細資訊
              </ThemedText>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>聯賽</ThemedText>
                  <ThemedText style={styles.detailValue}>{game.league}</ThemedText>
                </View>
                <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>時間</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {new Date(game.scheduled_at).toLocaleString('zh-TW')}
                  </ThemedText>
                </View>
                {game.venue && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.detailRow}>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>場地</ThemedText>
                      <ThemedText style={styles.detailValue}>{game.venue}</ThemedText>
                    </View>
                  </>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                留言 ({comments.length})
              </ThemedText>
              <CommentInput
                entityType="game"
                entityId={game.id}
                onCommentAdded={loadComments}
              />
              <View style={styles.commentsContainer}>
                <CommentList comments={comments} onCommentDeleted={loadComments} />
              </View>
            </View>
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
  content: {
    paddingBottom: Spacing.xxxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  detailCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  commentsContainer: {
    marginTop: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
});
