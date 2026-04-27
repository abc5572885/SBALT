/**
 * Box Score — 比賽結束後的數據總覽。
 *
 * 從 scores.tsx 結束按鈕進入。依運動別顯示對應數據欄位：
 *   - 籃球：分 / 板 / 助 / 抄 / 阻 / 失 / 犯
 *   - 排球：扣 / 攔 / 發 / 舉 / 救 / 失 / 總分
 *   - 羽球：殺 / 放 / 撲 / 失 / 贏分 / 輸分
 *
 * 每隊獨立 table，球員 row + 全隊小計。
 */

import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEventById } from '@/services/database';
import {
  BadmintonStat,
  BasketballStat,
  VolleyballStat,
  getEventBadmintonStats,
  getEventBasketballStats,
  getEventVolleyballStats,
  basketballTotalPoints,
} from '@/services/sportStats';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { Event } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TEAM_COLORS = ['#2563EB', '#DC2626'];

interface Column<T> {
  key: keyof T | string;
  label: string;
  /** Optional: derive value when key isn't a direct field. */
  getValue?: (stat: T) => number;
  /** Highlight the column (typically the points column). */
  primary?: boolean;
}

const BASKETBALL_COLS: Column<BasketballStat>[] = [
  { key: 'points', label: '分', getValue: (s) => basketballTotalPoints(s), primary: true },
  { key: 'rebounds', label: '板' },
  { key: 'assists', label: '助' },
  { key: 'steals', label: '抄' },
  { key: 'blocks', label: '阻' },
  { key: 'turnovers', label: '失' },
  { key: 'fouls', label: '犯' },
];

const VOLLEYBALL_COLS: Column<VolleyballStat>[] = [
  { key: 'points_total', label: '分', primary: true },
  { key: 'spikes', label: '扣' },
  { key: 'blocks', label: '攔' },
  { key: 'serve_aces', label: '發' },
  { key: 'set_assists', label: '舉' },
  { key: 'digs', label: '救' },
  { key: 'errors', label: '失' },
];

const BADMINTON_COLS: Column<BadmintonStat>[] = [
  { key: 'points_won', label: '贏分', primary: true },
  { key: 'smashes', label: '殺' },
  { key: 'drops', label: '放' },
  { key: 'net_kills', label: '撲' },
  { key: 'errors', label: '失' },
  { key: 'points_lost', label: '輸分' },
];

type AnyStat = BasketballStat | VolleyballStat | BadmintonStat;

export default function BoxScoreScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<AnyStat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const ev = await getEventById(eventId);
        setEvent(ev);
        const sport = ev?.sport_type;
        const data: AnyStat[] =
          sport === 'basketball' ? await getEventBasketballStats(eventId)
            : sport === 'volleyball' ? await getEventVolleyballStats(eventId)
              : sport === 'badminton' ? await getEventBadmintonStats(eventId)
                : [];
        setStats(data);
        const userIds = data.map((s) => s.user_id).filter(Boolean) as string[];
        if (userIds.length > 0) {
          setProfiles(await getProfilesByIds(userIds));
        }
      } catch (e) {
        console.error('[box-score] load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="比賽結算" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!event || stats.length === 0) {
    return (
      <ScreenLayout>
        <PageHeader title="比賽結算" />
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>沒有數據</Text>
        </View>
      </ScreenLayout>
    );
  }

  const sport = event.sport_type;
  const cols: Column<any>[] =
    sport === 'basketball' ? BASKETBALL_COLS
      : sport === 'volleyball' ? VOLLEYBALL_COLS
        : sport === 'badminton' ? BADMINTON_COLS
          : [];

  // Group by team
  const teamLabels: string[] = [];
  for (const s of stats) {
    if (!teamLabels.includes(s.team_label)) teamLabels.push(s.team_label);
  }

  // Compute team totals using the primary column (sum across players)
  const primaryCol = cols.find((c) => c.primary);
  const teamTotal = (label: string): number => {
    if (!primaryCol) return 0;
    return stats
      .filter((s) => s.team_label === label)
      .reduce((sum, s) => sum + (primaryCol.getValue ? primaryCol.getValue(s) : Number((s as any)[primaryCol.key]) || 0), 0);
  };

  const winnerLabel =
    teamLabels.length === 2 && teamTotal(teamLabels[0]) !== teamTotal(teamLabels[1])
      ? teamTotal(teamLabels[0]) > teamTotal(teamLabels[1])
        ? teamLabels[0]
        : teamLabels[1]
      : null;

  return (
    <ScreenLayout scrollable>
      <PageHeader title="比賽結算" />

      {/* Final score header */}
      <View style={styles.finalScoreRow}>
        {teamLabels.map((label, i) => (
          <View key={label} style={styles.finalScoreCol}>
            <Text style={[styles.finalTeamLabel, { color: TEAM_COLORS[i] }]}>{label}</Text>
            <Text style={[styles.finalScore, { color: colors.text }]}>{teamTotal(label)}</Text>
            {winnerLabel === label && (
              <Text style={[styles.winnerBadge, { color: colors.primary }]}>勝</Text>
            )}
          </View>
        ))}
      </View>

      {/* Per-team box score */}
      {teamLabels.map((label, teamIdx) => {
        const teamStats = stats.filter((s) => s.team_label === label);
        const colColor = TEAM_COLORS[teamIdx];
        return (
          <View key={label} style={styles.teamSection}>
            <View style={styles.teamHeader}>
              <View style={[styles.teamDot, { backgroundColor: colColor }]} />
              <Text style={[styles.teamHeaderLabel, { color: colors.text }]}>{label}</Text>
              <Text style={[styles.teamHeaderCount, { color: colors.textSecondary }]}>
                {teamStats.length} 人
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header row */}
                <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.cellPlayer, { color: colors.textSecondary }]}>球員</Text>
                  {cols.map((c) => (
                    <Text
                      key={String(c.key)}
                      style={[
                        styles.cellNum,
                        { color: c.primary ? colors.text : colors.textSecondary, fontWeight: c.primary ? '700' : '500' },
                      ]}
                    >
                      {c.label}
                    </Text>
                  ))}
                </View>

                {/* Player rows */}
                {teamStats.map((s) => {
                  const name = s.user_id
                    ? getDisplayName(profiles[s.user_id], s.user_id, false)
                    : s.display_name || '';
                  const jersey = s.jersey_number ? `#${s.jersey_number}` : '';
                  return (
                    <View
                      key={s.id}
                      style={[styles.tableRow, { borderBottomColor: colors.border }]}
                    >
                      <View style={styles.cellPlayer}>
                        {jersey ? (
                          <Text style={[styles.jersey, { color: colColor }]}>{jersey}</Text>
                        ) : null}
                        <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
                          {name}
                        </Text>
                      </View>
                      {cols.map((c) => {
                        const val = c.getValue ? c.getValue(s) : Number((s as any)[c.key]) || 0;
                        return (
                          <Text
                            key={String(c.key)}
                            style={[
                              styles.cellNum,
                              {
                                color: c.primary ? colors.text : colors.textSecondary,
                                fontWeight: c.primary ? '800' : '500',
                              },
                            ]}
                          >
                            {val}
                          </Text>
                        );
                      })}
                    </View>
                  );
                })}

                {/* Team total row */}
                <View style={[styles.tableRow, styles.tableTotalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.cellPlayer, { color: colors.text, fontWeight: '700' }]}>小計</Text>
                  {cols.map((c) => {
                    const total = teamStats.reduce(
                      (sum, s) => sum + (c.getValue ? c.getValue(s) : Number((s as any)[c.key]) || 0),
                      0,
                    );
                    return (
                      <Text
                        key={String(c.key)}
                        style={[
                          styles.cellNum,
                          {
                            color: colors.text,
                            fontWeight: '800',
                          },
                        ]}
                      >
                        {total}
                      </Text>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.continueBtn, { backgroundColor: colors.text }, Shadows.sm]}
        onPress={() => router.replace({ pathname: '/event/scores', params: { eventId } })}
        activeOpacity={0.85}
      >
        <Text style={[styles.continueBtnText, { color: colors.background }]}>繼續記錄</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.doneBtn, { borderColor: colors.border }]}
        onPress={() => router.dismissAll()}
        activeOpacity={0.7}
      >
        <Text style={[styles.doneBtnText, { color: colors.textSecondary }]}>返回活動</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  finalScoreRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  finalScoreCol: { flex: 1, alignItems: 'center', gap: 4 },
  finalTeamLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  finalScore: { fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  winnerBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  teamSection: { marginBottom: Spacing.xl },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  teamDot: { width: 8, height: 8, borderRadius: 4 },
  teamHeaderLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  teamHeaderCount: { fontSize: 12 },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  tableTotalRow: {
    borderTopWidth: 1,
    borderBottomWidth: 0,
    paddingTop: Spacing.md,
    marginTop: 2,
  },
  cellPlayer: {
    width: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  } as any,
  jersey: { fontSize: 12, fontWeight: '800' },
  playerName: { fontSize: 13, fontWeight: '600', flex: 1 },
  cellNum: {
    width: 38,
    textAlign: 'center',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  continueBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  continueBtnText: { fontSize: 15, fontWeight: '700' },
  doneBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  doneBtnText: { fontSize: 14, fontWeight: '600' },
});
