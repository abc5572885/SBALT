/**
 * Box Score — 比賽結束後的數據總覽。
 *
 * 從 scores.tsx 結束按鈕進入。依運動別顯示對應數據欄位，
 * 命中率 (M-A %) 對齊國際標準（NBA / FIVB / BWF box score）。
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
  basketballTotalPoints,
  basketballTotalRebounds,
  getEventBadmintonStats,
  getEventBasketballStats,
  getEventVolleyballStats,
} from '@/services/sportStats';
import {
  BadmintonGame,
  VolleyballSet,
  formatMatchDuration,
  getBadmintonGames,
  getVolleyballSets,
} from '@/services/matchTime';
import {
  ActionRow,
  aggregateQuarterScores,
  computePlayerIntervals,
  computePlusMinus,
  getEventActions,
  intervalsTotalSeconds,
} from '@/services/eventActions';
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

const formatMA = (made: number, attempted: number): string =>
  attempted === 0 ? '—' : `${made}-${attempted}`;

const formatPct = (made: number, attempted: number): string =>
  attempted === 0 ? '—' : `${Math.round((made / attempted) * 100)}%`;

const sumBy = <T,>(arr: T[], fn: (x: T) => number): number =>
  arr.reduce((sum, x) => sum + fn(x), 0);

interface Column<T> {
  label: string;
  width?: number;
  render: (s: T) => string;
  total: (ss: T[]) => string;
  primary?: boolean;
}

interface BasketballCtx {
  matchStart: string | null;
  matchEnd: string | null;
  actions: ActionRow[];
}

const formatMinutes = (sec: number): string => {
  if (sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function basketballMinutesSec(s: BasketballStat, ctx: BasketballCtx): number {
  if (!ctx.matchStart) return 0;
  const end = ctx.matchEnd || new Date().toISOString();
  const intervals = computePlayerIntervals(s.id, s.is_starter, ctx.matchStart, end, ctx.actions);
  return intervalsTotalSeconds(intervals);
}

function basketballPlusMinus(s: BasketballStat, ctx: BasketballCtx): number {
  if (!ctx.matchStart) return 0;
  const end = ctx.matchEnd || new Date().toISOString();
  const intervals = computePlayerIntervals(s.id, s.is_starter, ctx.matchStart, end, ctx.actions);
  const scoring = ctx.actions.filter((a) => a.points_delta > 0);
  return computePlusMinus(s.team_label, intervals, scoring);
}

const formatPlusMinus = (n: number): string => (n > 0 ? `+${n}` : String(n));

const buildBasketballCols = (ctx: BasketballCtx): Column<BasketballStat>[] => [
  {
    label: 'MIN',
    width: 50,
    render: (s) => formatMinutes(basketballMinutesSec(s, ctx)),
    total: (ss) => formatMinutes(sumBy(ss, (s) => basketballMinutesSec(s, ctx))),
  },
  {
    label: '+/-',
    width: 44,
    render: (s) => formatPlusMinus(basketballPlusMinus(s, ctx)),
    total: () => '—',
  },
  {
    label: '分',
    width: 36,
    primary: true,
    render: (s) => String(basketballTotalPoints(s)),
    total: (ss) => String(sumBy(ss, basketballTotalPoints)),
  },
  {
    label: 'FT',
    width: 48,
    render: (s) => formatMA(s.points_1pt, s.points_1pt + s.misses_1pt),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.points_1pt), sumBy(ss, (s) => s.points_1pt + s.misses_1pt)),
  },
  {
    label: 'FT%',
    width: 44,
    render: (s) => formatPct(s.points_1pt, s.points_1pt + s.misses_1pt),
    total: (ss) =>
      formatPct(sumBy(ss, (s) => s.points_1pt), sumBy(ss, (s) => s.points_1pt + s.misses_1pt)),
  },
  {
    label: '2P',
    width: 48,
    render: (s) => formatMA(s.points_2pt, s.points_2pt + s.misses_2pt),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.points_2pt), sumBy(ss, (s) => s.points_2pt + s.misses_2pt)),
  },
  {
    label: '2P%',
    width: 44,
    render: (s) => formatPct(s.points_2pt, s.points_2pt + s.misses_2pt),
    total: (ss) =>
      formatPct(sumBy(ss, (s) => s.points_2pt), sumBy(ss, (s) => s.points_2pt + s.misses_2pt)),
  },
  {
    label: '3P',
    width: 48,
    render: (s) => formatMA(s.points_3pt, s.points_3pt + s.misses_3pt),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.points_3pt), sumBy(ss, (s) => s.points_3pt + s.misses_3pt)),
  },
  {
    label: '3P%',
    width: 44,
    render: (s) => formatPct(s.points_3pt, s.points_3pt + s.misses_3pt),
    total: (ss) =>
      formatPct(sumBy(ss, (s) => s.points_3pt), sumBy(ss, (s) => s.points_3pt + s.misses_3pt)),
  },
  {
    label: 'OFF',
    width: 36,
    render: (s) => String(s.offensive_rebounds),
    total: (ss) => String(sumBy(ss, (s) => s.offensive_rebounds)),
  },
  {
    label: 'DEF',
    width: 36,
    render: (s) => String(s.defensive_rebounds),
    total: (ss) => String(sumBy(ss, (s) => s.defensive_rebounds)),
  },
  {
    label: '板',
    width: 36,
    render: (s) => String(basketballTotalRebounds(s)),
    total: (ss) => String(sumBy(ss, basketballTotalRebounds)),
  },
  { label: '助', width: 36, render: (s) => String(s.assists), total: (ss) => String(sumBy(ss, (s) => s.assists)) },
  { label: '抄', width: 36, render: (s) => String(s.steals), total: (ss) => String(sumBy(ss, (s) => s.steals)) },
  { label: '阻', width: 36, render: (s) => String(s.blocks), total: (ss) => String(sumBy(ss, (s) => s.blocks)) },
  { label: '失', width: 36, render: (s) => String(s.turnovers), total: (ss) => String(sumBy(ss, (s) => s.turnovers)) },
  { label: '犯', width: 36, render: (s) => String(s.fouls), total: (ss) => String(sumBy(ss, (s) => s.fouls)) },
];

// ─── Volleyball ────────────────────────────────────────────────
const VOLLEYBALL_COLS: Column<VolleyballStat>[] = [
  {
    label: '分',
    width: 36,
    primary: true,
    render: (s) => String(s.points_total),
    total: (ss) => String(sumBy(ss, (s) => s.points_total)),
  },
  {
    label: '扣',
    width: 48,
    render: (s) => formatMA(s.spikes, s.spikes + s.spike_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.spikes), sumBy(ss, (s) => s.spikes + s.spike_errors)),
  },
  {
    label: '扣%',
    width: 44,
    render: (s) => formatPct(s.spikes, s.spikes + s.spike_errors),
    total: (ss) =>
      formatPct(sumBy(ss, (s) => s.spikes), sumBy(ss, (s) => s.spikes + s.spike_errors)),
  },
  {
    label: '攔',
    width: 48,
    render: (s) => formatMA(s.blocks, s.blocks + s.block_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.blocks), sumBy(ss, (s) => s.blocks + s.block_errors)),
  },
  {
    label: '發ACE',
    width: 50,
    render: (s) => formatMA(s.serve_aces, s.serve_aces + s.serve_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.serve_aces), sumBy(ss, (s) => s.serve_aces + s.serve_errors)),
  },
  {
    label: '接',
    width: 48,
    render: (s) => formatMA(s.reception_successes, s.reception_successes + s.reception_errors),
    total: (ss) =>
      formatMA(
        sumBy(ss, (s) => s.reception_successes),
        sumBy(ss, (s) => s.reception_successes + s.reception_errors),
      ),
  },
  {
    label: '接%',
    width: 44,
    render: (s) => formatPct(s.reception_successes, s.reception_successes + s.reception_errors),
    total: (ss) =>
      formatPct(
        sumBy(ss, (s) => s.reception_successes),
        sumBy(ss, (s) => s.reception_successes + s.reception_errors),
      ),
  },
  { label: '助', width: 36, render: (s) => String(s.set_assists), total: (ss) => String(sumBy(ss, (s) => s.set_assists)) },
  { label: '救', width: 36, render: (s) => String(s.digs), total: (ss) => String(sumBy(ss, (s) => s.digs)) },
];

// ─── Badminton ────────────────────────────────────────────────
const BADMINTON_COLS: Column<BadmintonStat>[] = [
  {
    label: '贏分',
    width: 44,
    primary: true,
    render: (s) => String(s.points_won),
    total: (ss) => String(sumBy(ss, (s) => s.points_won)),
  },
  {
    label: '殺',
    width: 48,
    render: (s) => formatMA(s.smashes, s.smashes + s.smash_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.smashes), sumBy(ss, (s) => s.smashes + s.smash_errors)),
  },
  {
    label: '殺%',
    width: 44,
    render: (s) => formatPct(s.smashes, s.smashes + s.smash_errors),
    total: (ss) =>
      formatPct(sumBy(ss, (s) => s.smashes), sumBy(ss, (s) => s.smashes + s.smash_errors)),
  },
  {
    label: '放',
    width: 48,
    render: (s) => formatMA(s.drops, s.drops + s.drop_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.drops), sumBy(ss, (s) => s.drops + s.drop_errors)),
  },
  {
    label: '放%',
    width: 44,
    render: (s) => formatPct(s.drops, s.drops + s.drop_errors),
    total: (ss) =>
      formatPct(sumBy(ss, (s) => s.drops), sumBy(ss, (s) => s.drops + s.drop_errors)),
  },
  {
    label: '撲',
    width: 48,
    render: (s) => formatMA(s.net_kills, s.net_kills + s.net_kill_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.net_kills), sumBy(ss, (s) => s.net_kills + s.net_kill_errors)),
  },
  {
    label: '撲%',
    width: 44,
    render: (s) => formatPct(s.net_kills, s.net_kills + s.net_kill_errors),
    total: (ss) =>
      formatPct(sumBy(ss, (s) => s.net_kills), sumBy(ss, (s) => s.net_kills + s.net_kill_errors)),
  },
  {
    label: '高遠',
    width: 48,
    render: (s) => formatMA(s.clears, s.clears + s.clear_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.clears), sumBy(ss, (s) => s.clears + s.clear_errors)),
  },
  {
    label: '平抽',
    width: 48,
    render: (s) => formatMA(s.drives, s.drives + s.drive_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.drives), sumBy(ss, (s) => s.drives + s.drive_errors)),
  },
  {
    label: '挑',
    width: 48,
    render: (s) => formatMA(s.lifts, s.lifts + s.lift_errors),
    total: (ss) =>
      formatMA(sumBy(ss, (s) => s.lifts), sumBy(ss, (s) => s.lifts + s.lift_errors)),
  },
  { label: '失', width: 36, render: (s) => String(s.errors), total: (ss) => String(sumBy(ss, (s) => s.errors)) },
  { label: '輸分', width: 44, render: (s) => String(s.points_lost), total: (ss) => String(sumBy(ss, (s) => s.points_lost)) },
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
  const [vballSets, setVballSets] = useState<VolleyballSet[]>([]);
  const [bminGames, setBminGames] = useState<BadmintonGame[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
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
        if (sport === 'volleyball') setVballSets(await getVolleyballSets(eventId));
        if (sport === 'badminton') setBminGames(await getBadmintonGames(eventId));
        setActions(await getEventActions(eventId));
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
  const matchStart = (event as any).match_started_at as string | null;
  const matchEnd = (event as any).match_ended_at as string | null;
  const cols: Column<any>[] =
    sport === 'basketball'
      ? buildBasketballCols({ matchStart, matchEnd, actions })
      : sport === 'volleyball' ? VOLLEYBALL_COLS
        : sport === 'badminton' ? BADMINTON_COLS
          : [];

  // Group by team
  const teamLabels: string[] = [];
  for (const s of stats) {
    if (!teamLabels.includes(s.team_label)) teamLabels.push(s.team_label);
  }

  // Team final score = sum of primary column for that team
  const primaryCol = cols.find((c) => c.primary);
  const teamTotal = (label: string): number => {
    if (!primaryCol) return 0;
    const teamStats = stats.filter((s) => s.team_label === label);
    return Number(primaryCol.total(teamStats)) || 0;
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

      {/* Match duration */}
      {(event as any)?.match_started_at && (
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            比賽時長 {formatMatchDuration((event as any).match_started_at, (event as any).match_ended_at)}
          </Text>
        </View>
      )}

      {/* Per-set / per-game scores */}
      {sport === 'volleyball' && vballSets.length > 0 && (
        <View style={styles.setCard}>
          <Text style={[styles.setCardTitle, { color: colors.textSecondary }]}>逐局比分</Text>
          <View style={[styles.setHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.setLabelCell, { color: colors.textSecondary }]}>局數</Text>
            {vballSets.map((s) => (
              <Text key={s.id} style={[styles.setNumCell, { color: colors.textSecondary }]}>
                第 {s.set_number}
              </Text>
            ))}
            <Text style={[styles.setNumCell, { color: colors.text, fontWeight: '700' }]}>總</Text>
          </View>
          {teamLabels.map((label, idx) => {
            const isHome = idx === 0;
            return (
              <View key={label} style={[styles.setDataRow, { borderBottomColor: colors.border }]}>
                <View style={styles.setLabelCell}>
                  <View style={[styles.setLabelDot, { backgroundColor: TEAM_COLORS[idx] }]} />
                  <Text style={[styles.setLabelText, { color: colors.text }]}>{label}</Text>
                </View>
                {vballSets.map((s) => {
                  const score = isHome ? s.home_score : s.away_score;
                  const won = isHome ? s.home_score > s.away_score : s.away_score > s.home_score;
                  return (
                    <Text
                      key={s.id}
                      style={[
                        styles.setNumCell,
                        { color: won ? colors.text : colors.textSecondary, fontWeight: won ? '800' : '500' },
                      ]}
                    >
                      {score}
                    </Text>
                  );
                })}
                <Text style={[styles.setNumCell, { color: colors.text, fontWeight: '800' }]}>
                  {vballSets.reduce((sum, s) => sum + (isHome ? s.home_score : s.away_score), 0)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {sport === 'basketball' && (() => {
        const qScores = aggregateQuarterScores(actions);
        const quarters = Array.from(qScores.keys()).sort((a, b) => a - b);
        if (quarters.length === 0) return null;
        return (
          <View style={styles.setCard}>
            <Text style={[styles.setCardTitle, { color: colors.textSecondary }]}>逐節比分</Text>
            <View style={[styles.setHeaderRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.setLabelCell, { color: colors.textSecondary }]}>節數</Text>
              {quarters.map((q) => (
                <Text key={q} style={[styles.setNumCell, { color: colors.textSecondary }]}>
                  {q <= 4 ? `Q${q}` : `OT${q - 4}`}
                </Text>
              ))}
              <Text style={[styles.setNumCell, { color: colors.text, fontWeight: '700' }]}>總</Text>
            </View>
            {teamLabels.map((label, idx) => (
              <View key={label} style={[styles.setDataRow, { borderBottomColor: colors.border }]}>
                <View style={styles.setLabelCell}>
                  <View style={[styles.setLabelDot, { backgroundColor: TEAM_COLORS[idx] }]} />
                  <Text style={[styles.setLabelText, { color: colors.text }]}>{label}</Text>
                </View>
                {quarters.map((q) => {
                  const score = qScores.get(q)?.get(label) || 0;
                  return (
                    <Text
                      key={q}
                      style={[
                        styles.setNumCell,
                        { color: colors.text, fontWeight: '600' },
                      ]}
                    >
                      {score}
                    </Text>
                  );
                })}
                <Text style={[styles.setNumCell, { color: colors.text, fontWeight: '800' }]}>
                  {quarters.reduce((sum, q) => sum + (qScores.get(q)?.get(label) || 0), 0)}
                </Text>
              </View>
            ))}
          </View>
        );
      })()}

      {sport === 'badminton' && bminGames.length > 0 && (
        <View style={styles.setCard}>
          <Text style={[styles.setCardTitle, { color: colors.textSecondary }]}>逐局比分</Text>
          <View style={[styles.setHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.setLabelCell, { color: colors.textSecondary }]}>局數</Text>
            {bminGames.map((g) => (
              <Text key={g.id} style={[styles.setNumCell, { color: colors.textSecondary }]}>
                第 {g.game_number}
              </Text>
            ))}
          </View>
          {teamLabels.map((label, idx) => {
            const isHome = idx === 0;
            return (
              <View key={label} style={[styles.setDataRow, { borderBottomColor: colors.border }]}>
                <View style={styles.setLabelCell}>
                  <View style={[styles.setLabelDot, { backgroundColor: TEAM_COLORS[idx] }]} />
                  <Text style={[styles.setLabelText, { color: colors.text }]}>{label}</Text>
                </View>
                {bminGames.map((g) => {
                  const score = isHome ? g.home_score : g.away_score;
                  const won = isHome ? g.home_score > g.away_score : g.away_score > g.home_score;
                  return (
                    <Text
                      key={g.id}
                      style={[
                        styles.setNumCell,
                        { color: won ? colors.text : colors.textSecondary, fontWeight: won ? '800' : '500' },
                      ]}
                    >
                      {score}
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}

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
                  <Text style={[styles.cellPlayerHeader, { color: colors.textSecondary }]}>球員</Text>
                  {cols.map((c) => (
                    <Text
                      key={c.label}
                      style={[
                        styles.cellNum,
                        { width: c.width || 38 },
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
                      {cols.map((c) => (
                        <Text
                          key={c.label}
                          style={[
                            styles.cellNum,
                            { width: c.width || 38 },
                            {
                              color: c.primary ? colors.text : colors.textSecondary,
                              fontWeight: c.primary ? '800' : '500',
                            },
                          ]}
                        >
                          {c.render(s)}
                        </Text>
                      ))}
                    </View>
                  );
                })}

                {/* Team total row */}
                <View style={[styles.tableRow, styles.tableTotalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.cellPlayerHeader, { color: colors.text, fontWeight: '700' }]}>小計</Text>
                  {cols.map((c) => (
                    <Text
                      key={c.label}
                      style={[
                        styles.cellNum,
                        { width: c.width || 38 },
                        { color: colors.text, fontWeight: '800' },
                      ]}
                    >
                      {c.total(teamStats)}
                    </Text>
                  ))}
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
    alignItems: 'center',
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
  },
  cellPlayerHeader: {
    width: 130,
    fontSize: 13,
  },
  jersey: { fontSize: 12, fontWeight: '800' },
  playerName: { fontSize: 13, fontWeight: '600', flex: 1 },
  cellNum: {
    textAlign: 'center',
    fontSize: 13,
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

  // Match meta + per-set scores card
  metaRow: { alignItems: 'center', marginBottom: Spacing.md },
  metaText: { fontSize: 12, fontVariant: ['tabular-nums'] },
  setCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  setCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  setHeaderRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  setDataRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  setLabelCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
  },
  setLabelDot: { width: 8, height: 8, borderRadius: 4 },
  setLabelText: { fontSize: 14, fontWeight: '600' },
  setNumCell: {
    width: 50,
    textAlign: 'center',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
});
