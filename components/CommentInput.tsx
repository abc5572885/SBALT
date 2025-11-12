/**
 * Comment Input Component
 * Allows users to create comments on games, teams, players, etc.
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
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
      <ThemedView style={styles.loginPrompt}>
        <ThemedText style={styles.loginText}>請先登入以發表留言</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="輸入留言..."
        placeholderTextColor="#999"
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={500}
        editable={!loading}
      />
      <View style={styles.footer}>
        <ThemedText style={styles.charCount}>{content.length}/500</ThemedText>
        <TouchableOpacity
          style={[styles.submitButton, (!content.trim() || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || loading}
        >
          <ThemedText style={styles.submitText}>{loading ? '發送中...' : '發送'}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  input: {
    minHeight: 80,
    maxHeight: 120,
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
    padding: 8,
    backgroundColor: '#FFF',
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
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  submitText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loginPrompt: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    opacity: 0.7,
  },
});

