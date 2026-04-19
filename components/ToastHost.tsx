import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useToast } from '@/store/useToast';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (toasts.length === 0) return null;

  return (
    <SafeAreaView
      edges={['top']}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      <View pointerEvents="box-none" style={styles.container}>
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            message={t.message}
            type={t.type}
            colors={colors}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function ToastItem({ message, type, colors }: { message: string; type: 'success' | 'error' | 'info'; colors: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 2200);
    return () => clearTimeout(t);
  }, [opacity, translateY]);

  const bgColor = type === 'success'
    ? colors.statusSuccess
    : type === 'error'
      ? colors.error
      : colors.text;
  const textColor = '#FFF';

  return (
    <Animated.View
      style={[
        styles.toast,
        Shadows.md,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.toastText, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  toast: {
    maxWidth: '90%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
