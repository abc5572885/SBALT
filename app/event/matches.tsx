/**
 * Event Matches — 一場揪打活動內的場次列表。
 *
 * 顯示所有 matches、各自的比分／狀態，並提供建立新場次的入口。
 * Tap match card → 進入該場 scores（如已結束則進 box-score）。
 *
 * 場景：4 隊 round-robin 6 場、系隊邀請賽多場、週末四隊輪打。
 * 每場 match 有獨立陣容、計時、比分、計分流程。
 */

import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEventById } from '@/services/database';
import { createMatch, deleteMatch, Match, getEventMatches } from '@/services/matches';
import {
  getMatchBadmintonStats,
  getMatchBasketballStats,
  getMatchVolleyballStats,
  basketballTotalPoints,
} from '@/services/sportStats';
import { Event } from '@/types/database';
import { toast } from '@/store/useToast';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const TEAM_COLORS = ['#2563EB', '#DC2626'];

export default function MatchesScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [event, setEvent] = useState<Event | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scoresByMatch, setScoresByMatch] = useState<Record<string, { home: number; away: number }>>({});
  const [loading, setLoading] = useState(true);

  // New match modal
  const [createOpen, setCreateOpen] = useState(false);
  const [homeLabel, setHomeLabel] = useState('A 隊');
  const [awayLabel, setAwayLabel] = useState('B 隊');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [ev, ms] = await Promise.all([
        getEventById(eventId),
        getEventMatches(eventId),
      ]);
      setEvent(ev);
      setMatches(ms);

      // Compute live score for each match (sum of player points in their team)
      const sport = ev?.sport_type;
      if (sport && ms.length > 0) {
        const entries = await Promise.all(
          ms.map(async (m) => {
            let home = 0;
            let away = 0;
            if (sport === 'basketball') {
              const data = await getMatchBasketballStats(m.id);
              for (const s of data) {
                const pts = basketballTotalPoints(s);
                if (s.team_label === m.home_label) home += pts;
                else if (s.team_label === m.away_label) away += pts;
              }
            } else if (sport === 'volleyball') {
              const data = await getMatchVolleyballStats(m.id);
              for (const s of data) {
                const pts = s.points_total || 0;
                if (s.team_label === m.home_label) home += pts;
                else if (s.team_label === m.away_label) away += pts;
              }
            } else if (sport === 'badminton') {
              const data = await getMatchBadmintonStats(m.id);
              for (const s of data) {
                const pts = s.points_won || 0;
                if (s.team_label === m.home_label) home += pts;
                else if (s.team_label === m.away_label) away += pts;
              }
            }
            return [m.id, { home, away }] as const;
          }),
        );
        setScoresByMatch(Object.fromEntries(entries));
      }
    } catch (e) {
      console.error('[matches] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleCreate = async () => {
    if (!event || !eventId) return;
    if (!homeLabel.trim() || !awayLabel.trim()) {
      toast.error('請輸入兩隊名稱');
      return;
    }
    if (homeLabel.trim() === awayLabel.trim()) {
      toast.error('兩隊名稱不能相同');
      return;
    }
    try {
      setCreating(true);
      const m = await createMatch({
        eventId,
        sport: event.sport_type || 'other',
        homeLabel: homeLabel.trim(),
        awayLabel: awayLabel.trim(),
      });
      setCreateOpen(false);
      router.push({
        pathname: '/event/lineup',
        params: { eventId, matchId: m.id },
      });
    } catch (e: any) {
      toast.error(e?.message || '建立失敗');
    } finally {
      setCreating(false);
    }
  };

  const openMatch = (m: Match) => {
    router.push({
      pathname: m.status === 'finished' ? '/event/box-score' : '/event/scores',
      params: { eventId: eventId!, matchId: m.id },
    });
  };

  const confirmDelete = (m: Match) => {
    Alert.alert(
      `刪除「${m.home_label} vs ${m.away_label}」？`,
      '所有計分、換人、單局比分都會被清除，無法復原。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除場次',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMatch(m.id);
              loadData();
            } catch (e: any) {
              toast.error(e?.message || '刪除失敗');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="場次" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!event) {
    return (
      <ScreenLayout>
        <PageHeader title="場次" />
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>找不到活動</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable>
      <PageHeader title="場次" />

      <View style={styles.eventHeader}>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
          {matches.length === 0 ? '尚無場次' : `${matches.length} 場 · 點選任一場進入計分`}
        </Text>
      </View>

      {matches.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            還沒有場次。一場活動內可以開多場比賽（例如 4 隊輪流打、系隊對抗賽）。
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.text }, Shadows.sm]}
            onPress={() => setCreateOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: colors.background }]}>建立第一場</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.lg }}>
          {matches.map((m) => {
            const score = scoresByMatch[m.id] || { home: 0, away: 0 };
            const winner =
              score.home === score.away
                ? null
                : score.home > score.away
                  ? 'home'
                  : 'away';
            return (
              <View
                key={m.id}
                style={[styles.matchCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              >
                <Pressable onPress={() => openMatch(m)} style={styles.matchCardInner}>
                  <View style={styles.matchHeader}>
                    <View style={[styles.matchNumberPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.matchNumberText, { color: colors.textSecondary }]}>
                        第 {m.match_number} 場
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        m.status === 'finished'
                          ? { backgroundColor: colors.statusSuccess + '22' }
                          : m.status === 'cancelled'
                            ? { backgroundColor: colors.error + '22' }
                            : { backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              m.status === 'finished'
                                ? colors.statusSuccess
                                : m.status === 'cancelled'
                                  ? colors.error
                                  : colors.primary,
                          },
                        ]}
                      >
                        {m.status === 'finished' ? '已結束' : m.status === 'cancelled' ? '已取消' : '進行中'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.matchScoreRow}>
                    <View style={styles.matchTeamCol}>
                      <Text style={[styles.matchTeamLabel, { color: TEAM_COLORS[0] }]} numberOfLines={1}>
                        {m.home_label}
                      </Text>
                      <Text
                        style={[
                          styles.matchTeamScore,
                          { color: colors.text, fontWeight: winner === 'home' ? '900' : '700' },
                        ]}
                      >
                        {score.home}
                      </Text>
                    </View>
                    <Text style={[styles.matchScoreSep, { color: colors.textSecondary }]}>—</Text>
                    <View style={styles.matchTeamCol}>
                      <Text style={[styles.matchTeamLabel, { color: TEAM_COLORS[1] }]} numberOfLines={1}>
                        {m.away_label}
                      </Text>
                      <Text
                        style={[
                          styles.matchTeamScore,
                          { color: colors.text, fontWeight: winner === 'away' ? '900' : '700' },
                        ]}
                      >
                        {score.away}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                <TouchableOpacity
                  style={styles.matchDeleteBtn}
                  onPress={() => confirmDelete(m)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <IconSymbol name="trash" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.border }]}
            onPress={() => setCreateOpen(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="plus" size={16} color={colors.text} />
            <Text style={[styles.addBtnText, { color: colors.text }]}>新增場次</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* New match modal */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCreateOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>新增場次</Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              這場誰打誰？
            </Text>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>主隊</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                value={homeLabel}
                onChangeText={setHomeLabel}
                placeholder="例：A 隊 / 資工系"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>客隊</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                value={awayLabel}
                onChangeText={setAwayLabel}
                placeholder="例：B 隊 / 電機系"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setCreateOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.text }, creating && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.85}
              >
                <Text style={[styles.confirmText, { color: colors.background }]}>
                  {creating ? '建立中...' : '建立並設陣容'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  eventHeader: { marginBottom: Spacing.lg, gap: 4 },
  eventTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  eventMeta: { fontSize: 13 },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primaryBtn: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },

  matchCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  matchCardInner: { flex: 1, padding: Spacing.lg },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  matchNumberPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  matchNumberText: { fontSize: 11, fontWeight: '700' },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  matchScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matchTeamCol: { flex: 1, alignItems: 'center', gap: 2 },
  matchTeamLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  matchTeamScore: { fontSize: 30, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  matchScoreSep: { fontSize: 18, fontWeight: '300' },
  matchDeleteBtn: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(0,0,0,0.06)',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  modalHint: { fontSize: 13 },
  formField: { gap: 6 },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '700' },
});
