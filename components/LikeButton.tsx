import { ThemedText } from '@/components/themed-text';
import { useAppStore } from '@/store/useAppStore';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface LikeButtonProps {
  entityId: string;
  entityType: 'game' | 'team' | 'player' | 'news' | 'event' | 'comment';
  initialLiked?: boolean;
  initialCount?: number;
  onToggle?: (liked: boolean) => void;
}

export function LikeButton({
  entityId,
  entityType,
  initialLiked = false,
  initialCount = 0,
  onToggle,
}: LikeButtonProps) {
  const user = useAppStore((state) => state.user);
  const [liked, setLiked] = React.useState(initialLiked);
  const [count, setCount] = React.useState(initialCount);

  const handlePress = async () => {
    if (!user) {
      // TODO: 導向登入頁面
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newLiked = !liked;
    setLiked(newLiked);
    setCount((prev) => (newLiked ? prev + 1 : prev - 1));

    // TODO: 呼叫 Supabase API 更新按讚狀態
    if (onToggle) {
      onToggle(newLiked);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View style={[styles.iconContainer, liked && styles.iconContainerLiked]}>
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
    backgroundColor: '#F5F5F5',
  },
  iconContainerLiked: {
    backgroundColor: '#FFE5E5',
  },
  icon: {
    fontSize: 20,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
});

