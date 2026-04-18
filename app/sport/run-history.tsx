import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteRun,
  formatDistance,
  formatDuration,
  formatPace,
  getUserRuns,
  getUserRunStats,
} from '@/services/running';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RunHistoryScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [runs, setRuns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDistance: 0, totalDuration: 0, totalRuns: 0 });

  useFocusEffect(
    useCallback(() => {
      if (user) loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;
    const [runsData, statsData] = await Promise.all([
      getUserRuns(user.id),
      getUserRunStats(user.id),
    ]);
    setRuns(runsData);
    setStats(statsData);
  };

  const handleDelete = (runId: string) => {
    Alert.alert('刪除紀錄', '確定要刪除這筆跑步紀錄嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(runId);
          loadData();
        },
      },
    ]);
  };

  return (
    <ScreenLayout>
      <PageHeader title="跑步紀錄" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {(stats.totalDistance / 1000).toFixed(1)}
            </Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              總公里
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.totalRuns}
            </Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              總次數
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {formatDuration(stats.totalDuration)}
            </Text>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              總時間
            </ThemedText>
          </View>
        </View>

        {/* Run list */}
        {runs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={{ color: colors.textSecondary }}>
              尚無跑步紀錄
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {runs.map((run) => (
              <TouchableOpacity
                key={run.id}
                style={[styles.runCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                onLongPress={() => handleDelete(run.id)}
                activeOpacity={0.8}
              >
                <View style={styles.runHeader}>
                  <ThemedText style={styles.runDate}>
                    {new Date(run.started_at).toLocaleDateString('zh-TW', {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {new Date(run.started_at).toLocaleTimeString('zh-TW', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>
                <View style={styles.runStats}>
                  <View style={styles.runStat}>
                    <Text style={[styles.runStatValue, { color: colors.text }]}>
                      {formatDistance(parseFloat(run.distance))}
                    </Text>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>距離</ThemedText>
                  </View>
                  <View style={styles.runStat}>
                    <Text style={[styles.runStatValue, { color: colors.text }]}>
                      {formatDuration(run.duration)}
                    </Text>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>時間</ThemedText>
                  </View>
                  <View style={styles.runStat}>
                    <Text style={[styles.runStatValue, { color: colors.text }]}>
                      {formatPace(parseFloat(run.avg_pace || '0'))}
                    </Text>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>配速</ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    gap: Spacing.sm,
  },
  runCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  runStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  runStat: {
    gap: Spacing.xs,
  },
  runStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
