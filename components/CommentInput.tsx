/**
 * Comment Input Component
 * Allows users to create comments on games, teams, players, etc.
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createComment } from '@/services/database';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface CommentInputProps {
  entityType: 'game' | 'team' | 'player' | 'news' | 'event';
  entityId: string;
  onCommentAdded?: () => void;
}

export function CommentInput({ entityType, entityId, onCommentAdded }: CommentInputProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('請先登入', '留言功能需要先登入帳號');
      return;
    }

    if (!content.trim()) {
      Alert.alert('請輸入內容', '留言內容不能為空');
      return;
    }

    try {
      setLoading(true);
      await createComment({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        content: content.trim(),
      });

      setContent('');
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error: any) {
      console.error('建立留言失敗:', error);
      Alert.alert('錯誤', error.message || '建立留言失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <ThemedView style={[styles.loginPrompt, { backgroundColor: colors.card }]}>
        <ThemedText style={styles.loginText}>請先登入以發表留言</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.secondary }]}>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
        placeholder="輸入留言..."
        placeholderTextColor={colors.placeholder}
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={500}
        editable={!loading}
      />
      <View style={styles.footer}>
        <ThemedText style={styles.charCount}>{content.length}/500</ThemedText>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!content.trim() || loading) && { backgroundColor: colors.disabled, opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={!content.trim() || loading}
        >
          <ThemedText style={[styles.submitText, { color: colors.primaryText }]}>{loading ? '發送中...' : '發送'}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
  },
  input: {
    minHeight: 80,
    maxHeight: 120,
    fontSize: 14,
    lineHeight: 20,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginPrompt: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    opacity: 0.7,
  },
});

