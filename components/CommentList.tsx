import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Comment } from '@/types/database';
import { StyleSheet, View } from 'react-native';

interface CommentListProps {
  comments: Comment[];
  onLoadMore?: () => void;
}

export function CommentList({ comments, onLoadMore }: CommentListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  if (comments.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>尚無留言</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {comments.map((comment) => (
        <ThemedView key={comment.id} style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <ThemedText style={styles.userName}>用戶 {comment.user_id.slice(0, 8)}</ThemedText>
            <ThemedText style={styles.timestamp}>
              {formatDate(comment.created_at)}
            </ThemedText>
          </View>
          <ThemedText style={styles.content}>{comment.content}</ThemedText>
        </ThemedView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  commentCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
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

