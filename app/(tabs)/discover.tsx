import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEATURED_EVENTS = [
  {
    id: '1',
    title: '2026 新竹城市馬拉松',
    date: '2026年5月17日',
    location: '新竹市政府前廣場',
    category: '馬拉松',
    image: null,
  },
  {
    id: '2',
    title: '竹北三對三籃球賽',
    date: '2026年5月24日',
    location: '竹北國民運動中心',
    category: '籃球',
    image: null,
  },
  {
    id: '3',
    title: '新竹羽球公開賽',
    date: '2026年6月7日',
    location: '新科國民運動中心',
    category: '羽球',
    image: null,
  },
];

const NEWS = [
  {
    id: '1',
    title: '跑步新手必看：如何避免常見運動傷害',
    source: 'SBALT 運動誌',
    time: '2 小時前',
  },
  {
    id: '2',
    title: '2026 台灣馬拉松賽事總整理',
    source: 'SBALT 運動誌',
    time: '5 小時前',
  },
  {
    id: '3',
    title: '籃球鞋推薦：適合戶外場地的 5 雙好鞋',
    source: 'SBALT 運動誌',
    time: '1 天前',
  },
];

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>發現</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Featured events */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>賽事資訊</ThemedText>
            {FEATURED_EVENTS.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '15' }]}>
                  <ThemedText type="label" style={{ color: colors.primary }}>{event.category}</ThemedText>
                </View>
                <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
                <View style={styles.eventMeta}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="calendar" size={13} color={colors.textSecondary} />
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>{event.date}</ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <IconSymbol name="location.fill" size={13} color={colors.textSecondary} />
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>{event.location}</ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* News / Articles */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>運動新知</ThemedText>
            {NEWS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.newsCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                activeOpacity={0.7}
              >
                <View style={styles.newsContent}>
                  <ThemedText style={styles.newsTitle} numberOfLines={2}>{item.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {item.source} · {item.time}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Brand section placeholder */}
          <View style={[styles.brandSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText type="label" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              品牌合作
            </ThemedText>
            <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              想在這裡展示您的品牌？聯繫我們
            </ThemedText>
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  eventCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  newsCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  newsContent: {
    gap: Spacing.sm,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  brandSection: {
    padding: Spacing.xxl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
});
