import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteComment } from '@/services/database';
import { Comment } from '@/types/database';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

interface CommentListProps {
  comments: Comment[];
  onCommentDeleted?: () => void;
}

export function CommentList({ comments, onCommentDeleted }: CommentListProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  const handleDelete = async (commentId: string) => {
    Alert.alert('刪除留言', '確定要刪除這則留言嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
            if (onCommentDeleted) {
              onCommentDeleted();
            }
          } catch (error: any) {
            Alert.alert('錯誤', error.message || '刪除失敗');
          }
        },
      },
    ]);
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
      {comments.map((comment) => {
        const isOwner = user?.id === comment.user_id;
        return (
          <ThemedView key={comment.id} style={[styles.commentCard, { backgroundColor: colors.card }]}>
            <View style={styles.commentHeader}>
              <ThemedText style={styles.userName}>
                {isOwner ? '我' : `用戶 ${comment.user_id.slice(0, 8)}`}
              </ThemedText>
              <View style={styles.headerRight}>
                <ThemedText style={styles.timestamp}>
                  {formatDate(comment.created_at)}
                </ThemedText>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(comment.id)}
                  >
                    <ThemedText style={[styles.deleteText, { color: colors.error }]}>刪除</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <ThemedText style={styles.content}>{comment.content}</ThemedText>
          </ThemedView>
        );
      })}
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
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteText: {
    fontSize: 12,
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

