import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkAndUnlockAchievements, getUserAchievements } from '@/services/achievements';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface AchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  organize: '主辦',
  join: '參加',
  score: '記分',
  group: '社群',
};

export default function AchievementsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) loadAchievements();
    }, [user])
  );

  const loadAchievements = async () => {
    if (!user) return;
    try {
      // Check for new unlocks first
      await checkAndUnlockAchievements(user.id);
      // Then load all
      const data = await getUserAchievements(user.id);
      setAchievements(data);
    } catch (error) {
      console.error('載入成就失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="成就" />
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </ScreenLayout>
    );
  }

  // Group by category
  const categories = [...new Set(achievements.map((a) => a.category))];

  return (
    <ScreenLayout scrollable>
      <PageHeader title="成就" />

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={[styles.summaryNumber, { color: colors.primary }]}>{unlockedCount}</Text>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          / {achievements.length} 已解鎖
        </ThemedText>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary, width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` },
          ]}
        />
      </View>

      {/* Achievements by category */}
      {categories.map((category) => (
        <View key={category} style={styles.section}>
          <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {CATEGORY_LABELS[category] || category}
          </ThemedText>
          <View style={styles.grid}>
            {achievements
              .filter((a) => a.category === category)
              .map((achievement) => (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    { backgroundColor: colors.surface, borderColor: achievement.unlocked ? colors.primary : colors.border },
                    achievement.unlocked && Shadows.sm,
                  ]}
                >
                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: achievement.unlocked ? colors.primary : colors.disabled },
                  ]}>
                    <IconSymbol
                      name={achievement.icon as any}
                      size={20}
                      color={achievement.unlocked ? '#FFF' : colors.background}
                    />
                  </View>
                  <ThemedText
                    style={[styles.achievementTitle, !achievement.unlocked && { opacity: 0.4 }]}
                  >
                    {achievement.title}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={[{ color: colors.textSecondary }, !achievement.unlocked && { opacity: 0.4 }]}
                  >
                    {achievement.description}
                  </ThemedText>
                  {achievement.unlocked && achievement.unlockedAt && (
                    <ThemedText type="caption" style={{ color: colors.primary, marginTop: Spacing.xs }}>
                      {new Date(achievement.unlockedAt).toLocaleDateString('zh-TW')}
                    </ThemedText>
                  )}
                </View>
              ))}
          </View>
        </View>
      ))}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  summaryNumber: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    gap: Spacing.sm,
  },
  achievementCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
