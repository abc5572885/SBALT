import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLikeCount, hasUserLiked, toggleLike } from '@/services/database';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

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

  // Load initial like status and count
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
      Alert.alert('請先登入', '按讚功能需要先登入帳號');
      return;
    }

    if (loading) return;

    // Optimistic UI update
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
      // Rollback optimistic update
      setLiked(prevLiked);
      setCount(prevCount);
      Alert.alert('錯誤', error.message || '操作失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.card }, liked && { backgroundColor: colors.errorBackground }]}>
        <ThemedText style={styles.icon}>{liked ? '❤️' : '🤍'}</ThemedText>
      </View>
      {count > 0 && <ThemedText style={styles.count}>{count}</ThemedText>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
  },
  icon: {
    fontSize: 20,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
});

