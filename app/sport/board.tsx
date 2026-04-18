import { TacticalBoard } from '@/components/TacticalBoard';
import { VolleyballRotation } from '@/components/VolleyballRotation';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TacticalBoardScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const sportConfig = getSportConfig(type);

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <IconSymbol name="chevron.left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{sportConfig.label}戰術板</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <TacticalBoard sport={type as 'basketball' | 'volleyball'} />

        {type === 'volleyball' && (
          <View style={styles.rotationSection}>
            <VolleyballRotation />
          </View>
        )}
      </View>

      <Text style={[styles.tip, { color: colors.textSecondary }]}>
        雙擊場地切換 移動/畫線 模式
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '600' },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  rotationSection: { marginTop: Spacing.xl },
  tip: {
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: Spacing.md,
  },
});
