/**
 * Timeout / break countdown overlay.
 *
 * Used for volleyball (30s timeout) and badminton (60s mid-game break,
 * 120s between games). Fullscreen black-out so球員/球經 看得到大字。
 * Auto-closes at 0:00 with success haptic; recorder can also tap 跳過 to close early.
 */

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  seconds: number;
  label: string;
  onClose: () => void;
}

export function TimeoutOverlay({ visible, seconds, label, onClose }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!visible) return;
    setRemaining(seconds);
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setRemaining((r) => {
        const next = Math.max(0, r - delta);
        if (next <= 0 && r > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return next;
      });
    }, 250);
    return () => clearInterval(id);
  }, [visible, seconds]);

  // Auto-close when remaining hits 0 (after a brief beat so user sees 0)
  useEffect(() => {
    if (!visible) return;
    if (remaining > 0) return;
    const t = setTimeout(onClose, 1000);
    return () => clearTimeout(t);
  }, [visible, remaining, onClose]);

  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  const formatted = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[
            styles.countdown,
            remaining <= 5 && { color: '#F87171' },
          ]}
        >
          {formatted}
        </Text>
        <Pressable
          onPress={onClose}
          style={[styles.skipBtn, { borderColor: 'rgba(255,255,255,0.25)' }]}
        >
          <Text style={styles.skipText}>{remaining <= 0 ? '結束' : '跳過'}</Text>
        </Pressable>
        {/* Suppress unused colors warning */}
        <View style={{ height: 0, opacity: 0 }} pointerEvents="none">
          <Text style={{ color: colors.text }}>.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  countdown: {
    color: '#FFF',
    fontSize: 160,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -6,
  },
  skipBtn: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  skipText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
