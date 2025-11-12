import { ThemedView } from '@/components/themed-view';
import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenLayoutProps {
  children: ReactNode;
  scrollable?: boolean;
}

export function ScreenLayout({ children, scrollable = false }: ScreenLayoutProps) {
  const content = <ThemedView style={styles.container}>{children}</ThemedView>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {scrollable ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
});

