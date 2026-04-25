import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteComment } from '@/services/database';
import { getBlockedUserIds } from '@/services/moderation';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { Comment } from '@/types/database';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { UserActionMenu } from '@/components/UserActionMenu';
import { toast } from '@/store/useToast';

interface CommentListProps {
  comments: Comment[];
  onCommentDeleted?: () => void;
}

export function CommentList({ comments, onCommentDeleted }: CommentListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [profiles, setProfiles] = React.useState<Record<string, Profile>>({});
  const [blockedIds, setBlockedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const ids = [...new Set(comments.map((c) => c.user_id))];
    if (ids.length > 0) {
      getProfilesByIds(ids).then(setProfiles).catch(() => {});
    }
  }, [comments]);

  React.useEffect(() => {
    if (user) {
      getBlockedUserIds(user.id)
        .then((ids) => setBlockedIds(new Set(ids)))
        .catch(() => {});
    }
  }, [user]);

  const visibleComments = comments.filter((c) => !blockedIds.has(c.user_id));

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
            toast.error(error.message || '刪除失敗');
          }
        },
      },
    ]);
  };

  if (visibleComments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          尚無留言
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {visibleComments.map((comment) => {
        const isOwner = user?.id === comment.user_id;
        return (
          <View
            key={comment.id}
            style={[styles.commentCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
          >
            <View style={styles.commentHeader}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
                onPress={() => {
                  if (!isOwner) router.push(`/user/${comment.user_id}`);
                }}
                activeOpacity={isOwner ? 1 : 0.6}
                disabled={isOwner}
              >
                <ThemedText type="label">
                  {getDisplayName(profiles[comment.user_id], comment.user_id, isOwner)}
                </ThemedText>
                {profiles[comment.user_id]?.account_type !== 'regular' && (
                  <VerifiedBadge accountType={profiles[comment.user_id].account_type} size="small" />
                )}
              </TouchableOpacity>
              <View style={styles.headerRight}>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  {formatDate(comment.created_at)}
                </ThemedText>
                {isOwner ? (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(comment.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="trash" size={14} color={colors.error} />
                  </TouchableOpacity>
                ) : (
                  <UserActionMenu
                    targetUserId={comment.user_id}
                    targetLabel={getDisplayName(profiles[comment.user_id], comment.user_id, false)}
                    contentType="comment"
                    contentId={comment.id}
                    iconSize={14}
                    onBlocked={() => setBlockedIds((prev) => new Set([...prev, comment.user_id]))}
                  />
                )}
              </View>
            </View>
            <ThemedText style={styles.content}>{comment.content}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  commentCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
});
