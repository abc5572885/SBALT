/**
 * EmptyState — 統一的空狀態元件。
 *
 * Pattern: optional icon, primary title, optional supporting line, optional
 * single CTA button. Use this everywhere an empty list / no-data screen
 * appears so the visual treatment stays consistent across the app.
 */

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: IconSymbolName;
  cta?: { label: string; onPress: () => void };
  /** Compact variant for inline use within sections (less padding). */
  compact?: boolean;
  style?: ViewStyle;
}

export function EmptyState({ title, body, icon, cta, compact, style }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View
      style={[
        compact ? styles.containerCompact : styles.container,
        { borderColor: colors.border, backgroundColor: colors.surface },
        style,
      ]}
    >
      {icon && (
        <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
          <IconSymbol name={icon} size={22} color={colors.textSecondary} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {body && (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      )}
      {cta && (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.text }, Shadows.sm]}
          onPress={cta.onPress}
          activeOpacity={0.85}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.ctaText, { color: colors.background }]}>{cta.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.md,
  },
  containerCompact: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  cta: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
