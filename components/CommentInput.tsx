/**
 * Comment Input Component
 */

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
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
  const [focused, setFocused] = useState(false);

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
      <View style={[styles.loginPrompt, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          請先登入以發表留言
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
      <TextInput
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.background, borderColor: focused ? colors.primary : colors.border },
        ]}
        placeholder="輸入留言..."
        placeholderTextColor={colors.placeholder}
        value={content}
        onChangeText={setContent}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        maxLength={500}
        editable={!loading}
      />
      <View style={styles.footer}>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          {content.length}/500
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!content.trim() || loading) && { backgroundColor: colors.disabled },
          ]}
          onPress={handleSubmit}
          disabled={!content.trim() || loading}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.submitText}>
            {loading ? '發送中...' : '發送'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 72,
    maxHeight: 120,
    fontSize: 15,
    lineHeight: 22,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loginPrompt: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
