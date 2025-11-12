import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
}

const BACK_BUTTON_WIDTH = 80;
const HEADER_PADDING_HORIZONTAL = 16;
const HEADER_PADDING_VERTICAL = 8;

export function PageHeader({ title, showBack = true }: PageHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const primaryColor = Colors[colorScheme ?? 'light'].primary;

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.backButtonText, { color: primaryColor }]}>
            ← 返回
          </ThemedText>
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <ThemedText type="title" style={styles.headerTitle}>
        {title}
      </ThemedText>
      <View style={styles.backButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HEADER_PADDING_HORIZONTAL,
    paddingTop: HEADER_PADDING_VERTICAL,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    minWidth: BACK_BUTTON_WIDTH,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 32,
    flex: 1,
    textAlign: 'center',
  },
});

