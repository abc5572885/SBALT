/**
 * Placeholder shown on map-using pages when running in Expo Go (or any
 * environment where the native @rnmapbox/maps module is missing).
 */

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function MapUnavailable({ message }: { message?: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>地圖功能在 Expo Go 中不可用</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {message || '需要正式 build 才能載入 Mapbox 原生模組。'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
