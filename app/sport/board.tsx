import { PageHeader } from '@/components/PageHeader';
import { TacticalBoard } from '@/components/TacticalBoard';
import { ThemedView } from '@/components/themed-view';
import { VolleyballRotation } from '@/components/VolleyballRotation';
import { getSportConfig } from '@/constants/sports';
import { Spacing } from '@/constants/theme';
import { useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TacticalBoardScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const sportConfig = getSportConfig(type);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <PageHeader title={`${sportConfig.label}戰術板`} />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          contentContainerStyle={styles.content}
        >
          <TacticalBoard
            sport={type as 'basketball' | 'volleyball'}
            onDragStart={() => setScrollEnabled(false)}
            onDragEnd={() => setScrollEnabled(true)}
          />

          {type === 'volleyball' && (
            <View style={styles.rotationSection}>
              <VolleyballRotation />
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  scrollView: { flex: 1 },
  content: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  rotationSection: {
    marginTop: Spacing.lg,
  },
});
