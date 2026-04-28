/**
 * LoadingScreen — 統一的全頁載入狀態。
 *
 * Pattern: centered ActivityIndicator + optional 「載入中」text. Use this in
 * place of the half-dozen ad-hoc spinner blocks scattered across pages.
 *
 * For inline use within sections, just use ActivityIndicator directly.
 */

import { Colors, Spacing } from '@/constants/theme';
import { Copy } from '@/constants/copy';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface Props {
  label?: string;
  /** Hide the label entirely. */
  noLabel?: boolean;
  style?: ViewStyle;
}

export function LoadingScreen({ label, noLabel, style }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {!noLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label || Copy.loading}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
  },
  label: {
    fontSize: 13,
  },
});
