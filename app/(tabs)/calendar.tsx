import { LineChart } from '@/components/SimpleChart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserStats } from '@/services/database';
import { getUserRuns, getUserRunStats, formatDuration, formatPace } from '@/services/running';
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

type Period = 'week' | 'month' | 'year';

const PERIOD_LABEL: Record<Period, string> = {
  week: '本週',
  month: '本月',
  year: '今年',
};

const PERIOD_AVG_UNIT: Record<Period, string> = {
  week: '天',
  month: '週',
  year: '月',
};

export default function StatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { selectedSport } = useAppStore();
  const sportConfig = getSportConfig(selectedSport === 'all' ? null : selectedSport);

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [eventStats, setEventStats] = useState({ organized: 0, joined: 0 });
  const [runStats, setRunStats] = useState({ totalDistance: 0, totalDuration: 0, totalRuns: 0 });
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);

  const isRunning = selectedSport === 'running';
  const isBallSport = selectedSport === 'basketball' || selectedSport === 'volleyball' || selectedSport === 'badminton';
  const showRunning = isRunning || selectedSport === 'all';
  const showBall = isBallSport || selectedSport === 'all';

  useFocusEffect(
    useCallback(() => {
      if (user) loadStats();
    }, [user, selectedSport, period])
  );

  const loadStats = async () => {
    if (!user) return;
    try {
      const [evtStats, rStats] = await Promise.all([
        getUserStats(user.id, selectedSport),
        getUserRunStats(user.id),
      ]);
      setEventStats(evtStats);
      setRunStats(rStats);

      if (isRunning || selectedSport === 'all') {
        const runs = await getUserRuns(user.id);
        setChartData(buildChartData(runs, period, 'distance'));
      } else {
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
    p: Period,
    mode: 'distance' | 'count'
  ): { label: string; value: number }[] {
    const now = new Date();

    if (p === 'week') {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  // Hero metric: sum chart values (distance for running, count for ball/all)
  const periodTotal = chartData.reduce((sum, d) => sum + d.value, 0);
  const periodAvg = chartData.length > 0 ? periodTotal / chartData.length : 0;
  const heroUnit = showRunning && (isRunning || (selectedSport === 'all' && periodTotal > 0)) ? 'km' : '場';
  const heroLabel = isRunning
    ? '跑步距離'
    : isBallSport
      ? `${sportConfig.label}場次`
      : '參與場次';
  const heroValue = heroUnit === 'km' ? periodTotal.toFixed(1) : Math.round(periodTotal).toString();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>數據</Text>
          {selectedSport !== 'all' && (
            <View style={[styles.sportBadge, { backgroundColor: colors.secondary }]}>
              <ThemedText type="label" style={{ color: colors.text }}>
                {sportConfig.label}
              </ThemedText>
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Period selector */}
          <View style={styles.periodRow}>
            {(['year', 'month', 'week'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodBtn,
                  { borderColor: colors.border },
                  period === p && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.periodText,
                  { color: period === p ? colors.background : colors.textSecondary },
                ]}>
                  {p === 'week' ? '週' : p === 'month' ? '月' : '年'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* HERO METRIC */}
          <View style={[styles.hero, { backgroundColor: colors.text }]}>
            <Text style={[styles.heroPeriodLabel, { color: colors.background, opacity: 0.55 }]}>
              {PERIOD_LABEL[period]} · {heroLabel}
            </Text>
            <View style={styles.heroNumberRow}>
              <Text style={[styles.heroNumber, { color: colors.background }]}>
                {heroValue}
              </Text>
              <Text style={[styles.heroUnit, { color: colors.background, opacity: 0.55 }]}>
                {heroUnit}
              </Text>
            </View>
            {periodTotal > 0 ? (
              <Text style={[styles.heroSubtext, { color: colors.primary }]}>
                平均 {heroUnit === 'km' ? periodAvg.toFixed(1) : periodAvg.toFixed(1)} {heroUnit} / {PERIOD_AVG_UNIT[period]}
              </Text>
            ) : (
              <Text style={[styles.heroSubtext, { color: colors.background, opacity: 0.45 }]}>
                {showRunning ? '還沒開始記錄' : '還沒參加活動'}
              </Text>
            )}
          </View>

          {/* Chart */}
          {chartData.length > 0 && periodTotal > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary, marginBottom: Spacing.md }}>
                趨勢
              </ThemedText>
              <LineChart data={chartData} />
            </View>
          )}

          {/* Running supporting stats */}
          {showRunning && (
            <View style={styles.section}>
              <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                跑步累計
              </ThemedText>
              <View style={styles.supportGrid}>
                <SupportStat
                  colors={colors}
                  value={(runStats.totalDistance / 1000).toFixed(1)}
                  unit="km"
                  label="總距離"
                />
                <SupportStat
                  colors={colors}
                  value={runStats.totalRuns.toString()}
                  unit="次"
                  label="總次數"
                />
                <SupportStat
                  colors={colors}
                  value={formatDuration(runStats.totalDuration)}
                  label="總時間"
                />
                <SupportStat
                  colors={colors}
                  value={runStats.totalRuns > 0
                    ? formatPace((runStats.totalDuration / 60) / (runStats.totalDistance / 1000))
                    : '--:--'}
                  unit="/km"
                  label="平均配速"
                />
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

          {/* Ball sport supporting stats */}
          {showBall && (
            <View style={styles.section}>
              <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {selectedSport === 'all' ? '活動累計' : `${sportConfig.label}累計`}
              </ThemedText>
              <View style={styles.supportGrid}>
                <SupportStat
                  colors={colors}
                  value={eventStats.organized.toString()}
                  unit="場"
                  label="主辦"
                />
                <SupportStat
                  colors={colors}
                  value={eventStats.joined.toString()}
                  unit="場"
                  label="參加"
                />
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

function SupportStat({
  colors,
  value,
  unit,
  label,
}: {
  colors: typeof Colors.light;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View style={[styles.supportCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
      <View style={styles.supportValueRow}>
        <Text style={[styles.supportValue, { color: colors.text }]}>{value}</Text>
        {unit && <Text style={[styles.supportUnit, { color: colors.textSecondary }]}>{unit}</Text>}
      </View>
      <Text style={[styles.supportLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // HERO
  hero: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
    ...Shadows.md,
  },
  heroPeriodLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  heroNumber: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 68,
  },
  heroUnit: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroSubtext: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  // Chart
  chartCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  supportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  supportCard: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  supportValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  supportValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  supportUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  supportLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
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
