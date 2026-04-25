import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLikeCount, hasUserLiked, toggleLike } from '@/services/database';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { toast } from '@/store/useToast';

interface LikeButtonProps {
  entityId: string;
  entityType: 'game' | 'team' | 'player' | 'news' | 'event' | 'comment';
  onToggle?: (liked: boolean, count: number) => void;
}

export function LikeButton({ entityId, entityType, onToggle }: LikeButtonProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [liked, setLiked] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    loadLikeStatus();
  }, [entityId, entityType, user]);

  const loadLikeStatus = async () => {
    try {
      const [likeCount, userLiked] = await Promise.all([
        getLikeCount(entityType, entityId),
        user ? hasUserLiked(user.id, entityType, entityId) : Promise.resolve(false),
      ]);
      setCount(likeCount);
      setLiked(userLiked);
    } catch (error) {
      console.error('載入按讚狀態失敗:', error);
    }
  };

  const handlePress = async () => {
    if (!user) {
      toast.error('按讚功能需要先登入');
      return;
    }

    if (loading) return;

    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await toggleLike(user.id, entityType, entityId);
      setLiked(result.liked);
      setCount(result.count);

      if (onToggle) {
        onToggle(result.liked, result.count);
      }
    } catch (error: any) {
      console.error('切換按讚失敗:', error);
      setLiked(prevLiked);
      setCount(prevCount);
      toast.error(error.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.iconContainer, { backgroundColor: liked ? colors.errorBackground : colors.secondary }]}>
        <IconSymbol
          name={liked ? 'heart.fill' : 'heart'}
          size={18}
          color={liked ? colors.error : colors.textSecondary}
        />
      </View>
      {count > 0 && (
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          {count}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
