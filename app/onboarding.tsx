import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PAGES = [
  {
    title: '揪團',
    subtitle: '一鍵建立活動\n朋友報名、付款、簽到全搞定',
  },
  {
    title: '記分',
    subtitle: '全螢幕計分板\n籃球、排球、羽球各有專屬按鈕',
  },
  {
    title: '社群',
    subtitle: '建立球隊群組\n固定班底、公告、活動一手掌握',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = async () => {
    if (currentPage < PAGES.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      await AsyncStorage.setItem('onboarding_done', 'true');
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/(tabs)');
  };

  const page = PAGES[currentPage];
  const isLast = currentPage === PAGES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.6}>
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>跳過</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{page.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{page.subtitle}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentPage ? colors.text : colors.disabled },
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.text }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextText, { color: colors.background }]}>
            {isLast ? '開始使用' : '下一步'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: Spacing.lg,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '400',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  nextButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
