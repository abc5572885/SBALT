import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { hairlineWidth } = StyleSheet;

const POSITION_LABELS = ['前左', '前中', '前右', '後右', '後中', '後左'];

export function VolleyballRotation() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [players, setPlayers] = useState(['1', '2', '3', '4', '5', '6']);
  const [rotationCount, setRotationCount] = useState(0);

  const handleRotate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayers((prev) => {
      const newPlayers = [...prev];
      const last = newPlayers.pop()!;
      newPlayers.unshift(last);
      return newPlayers;
    });
    setRotationCount((c) => c + 1);
  };

  const handleReset = () => {
    setPlayers(['1', '2', '3', '4', '5', '6']);
    setRotationCount(0);
  };

  const handleEditPlayer = (index: number) => {
    // Simple name edit via prompt would need Alert.prompt (iOS only)
    // For now just rotate the number
  };

  return (
    <View style={styles.container}>
      {/* Court */}
      <View style={[styles.court, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F0F0F0' }]}>
        {/* Net */}
        <View style={[styles.net, { borderBottomColor: colors.border }]}>
          <Text style={[styles.netText, { color: colors.textSecondary }]}>NET</Text>
        </View>

        {/* Front row */}
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.positionWrapper}>
              <Text style={[styles.posLabel, { color: colors.textSecondary }]}>
                {POSITION_LABELS[i]}
              </Text>
              <View style={[styles.playerCircle, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.playerNumber}>{players[i]}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Back row */}
        <View style={styles.row}>
          {[5, 4, 3].map((i) => (
            <View key={i} style={styles.positionWrapper}>
              <View style={[styles.playerCircle, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.playerNumber}>{players[i]}</Text>
              </View>
              <Text style={[styles.posLabel, { color: colors.textSecondary }]}>
                {POSITION_LABELS[i]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Text style={[styles.rotationCount, { color: colors.textSecondary }]}>
          輪轉 {rotationCount} 次
        </Text>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.rotateBtn, { backgroundColor: colors.primary }]}
            onPress={handleRotate}
            activeOpacity={0.7}
          >
            <Text style={styles.rotateBtnText}>輪轉</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={handleReset}
            activeOpacity={0.6}
          >
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>重置</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  court: {
    // Uses theme colors, set inline
    borderRadius: Radius.sm,
    padding: Spacing.lg,
    gap: Spacing.lg,
    alignSelf: 'center',
    width: '100%',
  },
  net: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: undefined,
  },
  netText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  positionWrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  posLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  playerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  playerNumber: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rotationCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rotateBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  rotateBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resetBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
