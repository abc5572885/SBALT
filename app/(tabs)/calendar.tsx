import { BarChart } from '@/components/SimpleChart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserStats } from '@/services/database';
import { getUserRuns, getUserRunStats, formatDistance, formatDuration, formatPace } from '@/services/running';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { selectedSport } = useAppStore();
  const sportConfig = getSportConfig(selectedSport === 'all' ? null : selectedSport);

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [eventStats, setEventStats] = useState({ organized: 0, joined: 0 });
  const [runStats, setRunStats] = useState({ totalDistance: 0, totalDuration: 0, totalRuns: 0 });
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadStats();
    }, [user, selectedSport, period])
  );

  const loadStats = async () => {
    if (!user) return;
    try {
      const [evtStats, rStats] = await Promise.all([
        getUserStats(user.id),
        getUserRunStats(user.id),
      ]);
      setEventStats(evtStats);
      setRunStats(rStats);

      // Build chart data
      if (isRunning || selectedSport === 'all') {
        const runs = await getUserRuns(user.id);
        setChartData(buildChartData(runs, period, 'distance'));
      } else {
        // For ball sports, chart events by date
        const { data: regs } = await supabase
          .from('registrations')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('status', 'registered');
        setChartData(buildChartData(regs || [], period, 'count'));
      }
    } catch (error) {
      console.error('載入數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  function buildChartData(
    items: any[],
    p: 'week' | 'month' | 'year',
    mode: 'distance' | 'count'
  ): { label: string; value: number }[] {
    const now = new Date();

    if (p === 'week') {
      // Last 7 days
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      const result = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - 6 + i);
        return { date: d, label: days[d.getDay()], value: 0 };
      });
      items.forEach((item) => {
        const itemDate = new Date(item.started_at || item.created_at);
        const idx = result.findIndex((r) =>
          r.date.toDateString() === itemDate.toDateString()
        );
        if (idx >= 0) {
          result[idx].value += mode === 'distance' ? (parseFloat(item.distance) || 0) / 1000 : 1;
        }
      });
      return result.map((r) => ({ label: r.label, value: Math.round(r.value * 10) / 10 }));
    }

    if (p === 'month') {
      // Last 4 weeks
      const result = Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (3 - i) * 7);
        return { start: weekStart, label: `W${i + 1}`, value: 0 };
      });
      items.forEach((item) => {
        const itemDate = new Date(item.started_at || item.created_at);
        const daysAgo = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekIdx = 3 - Math.floor(daysAgo / 7);
        if (weekIdx >= 0 && weekIdx < 4) {
          result[weekIdx].value += mode === 'distance' ? (parseFloat(item.distance) || 0) / 1000 : 1;
        }
      });
      return result.map((r) => ({ label: r.label, value: Math.round(r.value * 10) / 10 }));
    }

    // Year - last 12 months
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const result = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { month: d.getMonth(), year: d.getFullYear(), label: months[d.getMonth()], value: 0 };
    });
    items.forEach((item) => {
      const itemDate = new Date(item.started_at || item.created_at);
      const idx = result.findIndex((r) => r.month === itemDate.getMonth() && r.year === itemDate.getFullYear());
      if (idx >= 0) {
        result[idx].value += mode === 'distance' ? (parseFloat(item.distance) || 0) / 1000 : 1;
      }
    });
    return result.map((r) => ({ label: r.label, value: Math.round(r.value * 10) / 10 }));
  }

  const isRunning = selectedSport === 'running';
  const isBallSport = selectedSport === 'basketball' || selectedSport === 'volleyball' || selectedSport === 'badminton';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>數據</Text>
          {selectedSport !== 'all' && (
            <View style={[styles.sportBadge, { backgroundColor: colors.primary + '15' }]}>
              <ThemedText type="label" style={{ color: colors.primary }}>
                {sportConfig.label}
              </ThemedText>
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Period selector */}
          <View style={styles.periodRow}>
            {(['week', 'month', 'year'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && { backgroundColor: colors.text }]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodText, { color: period === p ? colors.background : colors.textSecondary }]}>
                  {p === 'week' ? '週' : p === 'month' ? '月' : '年'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          {chartData.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary, marginBottom: Spacing.md }}>
                {isRunning || selectedSport === 'all' ? '跑步距離 (km)' : '活動場次'}
              </ThemedText>
              <BarChart data={chartData} />
            </View>
          )}

          {/* Running stats */}
          {(isRunning || selectedSport === 'all') && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>跑步</ThemedText>

              <View style={styles.bigStatRow}>
                <View style={styles.bigStat}>
                  <Text style={[styles.bigStatNumber, { color: colors.primary }]}>
                    {(runStats.totalDistance / 1000).toFixed(1)}
                  </Text>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>總公里</ThemedText>
                </View>
                <View style={[styles.bigStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.bigStat}>
                  <Text style={[styles.bigStatNumber, { color: colors.primary }]}>
                    {runStats.totalRuns}
                  </Text>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>跑步次數</ThemedText>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>總時間</ThemedText>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {formatDuration(runStats.totalDuration)}
                  </Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>平均配速</ThemedText>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {runStats.totalRuns > 0
                      ? formatPace((runStats.totalDuration / 60) / (runStats.totalDistance / 1000))
                      : '--:--'} /km
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionLink, { borderColor: colors.border }]}
                onPress={() => router.push('/sport/run-history')}
                activeOpacity={0.7}
              >
                <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>查看跑步紀錄</ThemedText>
                <IconSymbol name="chevron.right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Ball sport stats */}
          {(isBallSport || selectedSport === 'all') && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {selectedSport === 'all' ? '活動' : sportConfig.label}
              </ThemedText>

              <View style={styles.bigStatRow}>
                <View style={styles.bigStat}>
                  <Text style={[styles.bigStatNumber, { color: colors.primary }]}>
                    {eventStats.organized}
                  </Text>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>主辦場次</ThemedText>
                </View>
                <View style={[styles.bigStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.bigStat}>
                  <Text style={[styles.bigStatNumber, { color: colors.primary }]}>
                    {eventStats.joined}
                  </Text>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>參加場次</ThemedText>
                </View>
              </View>

              <View style={styles.linksRow}>
                <TouchableOpacity
                  style={[styles.actionLink, { borderColor: colors.border, flex: 1 }]}
                  onPress={() => router.push('/event/history')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>歷史戰績</ThemedText>
                  <IconSymbol name="chevron.right" size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionLink, { borderColor: colors.border, flex: 1 }]}
                  onPress={() => router.push('/event/achievements')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>成就</ThemedText>
                  <IconSymbol name="chevron.right" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* All mode — show everything */}
          {selectedSport === 'all' && (
            <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                點擊下方 S 按鈕選擇運動，查看專屬數據
              </ThemedText>
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  sportBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  periodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  bigStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  bigStat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bigStatNumber: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  bigStatDivider: {
    width: 1,
    height: 50,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  linksRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tipCard: {
    padding: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
