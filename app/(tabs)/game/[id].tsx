import { CommentInput } from '@/components/CommentInput';
import { CommentList } from '@/components/CommentList';
import { LikeButton } from '@/components/LikeButton';
import { PageHeader } from '@/components/PageHeader';
import { ScoreCard } from '@/components/ScoreCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
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
    } catch (error) {
      console.error('載入留言失敗:', error);
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

  if (error || !game) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>
            {error ? '載入失敗，請檢查網路連線' : '找不到此比賽'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); loadGame(); }}
          >
            <ThemedText style={[styles.retryText, { color: colors.primaryText }]}>重試</ThemedText>
          </TouchableOpacity>
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
            <ThemedText type="title" style={styles.sectionTitle}>
              比賽詳情
            </ThemedText>
            <ThemedText style={styles.detail}>
              <ThemedText style={styles.label}>聯賽：</ThemedText>
              {game.league}
            </ThemedText>
            <ThemedText style={styles.detail}>
              <ThemedText style={styles.label}>時間：</ThemedText>
              {new Date(game.scheduled_at).toLocaleString('zh-TW')}
            </ThemedText>
            {game.venue && (
              <ThemedText style={styles.detail}>
                <ThemedText style={styles.label}>場地：</ThemedText>
                {game.venue}
              </ThemedText>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="title" style={styles.sectionTitle}>
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
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
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
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  detail: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  label: {
    fontWeight: '600',
  },
  commentsContainer: {
    marginTop: 16,
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

