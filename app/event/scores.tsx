import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  BasketballAction,
  BASKETBALL_ACTIONS,
  getActionMeta as getBasketballActionMeta,
  recordAction as recordBasketballAction,
  undoAction as undoBasketballAction,
} from '@/services/basketballStats';
import {
  VolleyballAction,
  VOLLEYBALL_ACTIONS,
  getVolleyballActionMeta,
  recordVolleyballAction,
  undoVolleyballAction,
} from '@/services/volleyballStats';
import {
  BadmintonAction,
  BADMINTON_ACTIONS,
  getBadmintonActionMeta,
  recordBadmintonAction,
  undoBadmintonAction,
} from '@/services/badmintonStats';
import { getEventById, getEventScores, saveEventScores } from '@/services/database';
import {
  BadmintonGame,
  VolleyballSet,
  closeBadmintonGame,
  closeVolleyballSet,
  formatMatchDuration,
  getBadmintonGames,
  getVolleyballSets,
  markMatchEnded,
  markMatchStarted,
  openBadmintonGame,
  openVolleyballSet,
  resetMatchData,
  updateBadmintonGameScore,
  updateVolleyballSetScore,
} from '@/services/matchTime';
import {
  ActionRow,
  getEventActions,
  logAction,
  recordSubstitution,
} from '@/services/eventActions';
import {
  BasketballStat,
  VolleyballStat,
  BadmintonStat,
  getEventBasketballStats,
  getEventVolleyballStats,
  getEventBadmintonStats,
} from '@/services/sportStats';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { Event, EventScore } from '@/types/database';
import { toast } from '@/store/useToast';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAM_COLORS = ['#2563EB', '#DC2626'];

interface ScoreEntry {
  label: string;
  score: number;
}

type AnyAction = BasketballAction | VolleyballAction | BadmintonAction;
type AnyStat = BasketballStat | VolleyballStat | BadmintonStat;
type ProSportKey = 'basketball' | 'volleyball' | 'badminton';

interface ActionLog {
  id: string;
  stat_id: string;
  action: AnyAction;
  ts: number;
}

function isProSport(sport: string | undefined | null): sport is ProSportKey {
  return sport === 'basketball' || sport === 'volleyball' || sport === 'badminton';
}

function getPlayerTotalPoints(stat: AnyStat, sport: ProSportKey): number {
  if (sport === 'basketball') {
    const s = stat as BasketballStat;
    return s.points_1pt * 1 + s.points_2pt * 2 + s.points_3pt * 3;
  }
  if (sport === 'volleyball') return (stat as VolleyballStat).points_total || 0;
  return (stat as BadmintonStat).points_won || 0;
}

interface AdapterMeta {
  key: AnyAction;
  label: string;
  category: 'primary' | 'secondary';
  tone: 'score' | 'miss' | 'positive' | 'negative';
}

function getActionsForSport(sport: ProSportKey): AdapterMeta[] {
  if (sport === 'basketball') return BASKETBALL_ACTIONS as unknown as AdapterMeta[];
  if (sport === 'volleyball') return VOLLEYBALL_ACTIONS as unknown as AdapterMeta[];
  return BADMINTON_ACTIONS as unknown as AdapterMeta[];
}

function getActionLabel(sport: ProSportKey, action: AnyAction): string {
  if (sport === 'basketball') return getBasketballActionMeta(action as BasketballAction).label;
  if (sport === 'volleyball') return getVolleyballActionMeta(action as VolleyballAction).label;
  return getBadmintonActionMeta(action as BadmintonAction).label;
}

async function dispatchRecordAction(
  sport: ProSportKey,
  stat: AnyStat,
  action: AnyAction,
): Promise<AnyStat> {
  if (sport === 'basketball')
    return recordBasketballAction(stat as BasketballStat, action as BasketballAction);
  if (sport === 'volleyball')
    return recordVolleyballAction(stat as VolleyballStat, action as VolleyballAction);
  return recordBadmintonAction(stat as BadmintonStat, action as BadmintonAction);
}

async function dispatchUndoAction(
  sport: ProSportKey,
  stat: AnyStat,
  action: AnyAction,
): Promise<AnyStat> {
  if (sport === 'basketball')
    return undoBasketballAction(stat as BasketballStat, action as BasketballAction);
  if (sport === 'volleyball')
    return undoVolleyballAction(stat as VolleyballStat, action as VolleyballAction);
  return undoBadmintonAction(stat as BadmintonStat, action as BadmintonAction);
}

export default function EventScoresScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Pro mode state (basketball / volleyball / badminton)
  const [stats, setStats] = useState<AnyStat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selectedStatId, setSelectedStatId] = useState<string | null>(null);
  const [log, setLog] = useState<ActionLog[]>([]);
  const [showSecondary, setShowSecondary] = useState(false);

  // Simple mode state (running / other)
  const [entries, setEntries] = useState<ScoreEntry[]>([
    { label: '主隊', score: 0 },
    { label: '客隊', score: 0 },
  ]);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Phase 1: per-set scoring + match timer
  const [matchStartedAt, setMatchStartedAt] = useState<string | null>(null);
  const [matchEndedAt, setMatchEndedAt] = useState<string | null>(null);
  const [vballSets, setVballSets] = useState<VolleyballSet[]>([]);
  const [bminGames, setBminGames] = useState<BadmintonGame[]>([]);
  const [tick, setTick] = useState(0); // forces timer re-render

  // Phase 2: substitutions + on-court tracking
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [activeStatIds, setActiveStatIds] = useState<Set<string>>(new Set());
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subTeam, setSubTeam] = useState<string | null>(null);
  const [subOutStatId, setSubOutStatId] = useState<string | null>(null);
  const [subInStatId, setSubInStatId] = useState<string | null>(null);

  // Phase 3: basketball quarter tracking (1, 2, 3, 4, 5+ for OT)
  const [currentQuarter, setCurrentQuarter] = useState(1);

  const sportConfig = getSportConfig(event?.sport_type);
  const sportKey = event?.sport_type;
  const isPro = isProSport(sportKey);
  const buttons = sportConfig.scoreButtons;
  const primaryPoints = buttons.length >= 2 ? 2 : (buttons[0] || 1);
  const secondaryButtons = buttons.filter((b) => b !== primaryPoints);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      const eventData = await getEventById(eventId);
      const sport = eventData?.sport_type;
      const [existingScores, sportStats] = await Promise.all([
        getEventScores(eventId),
        sport === 'basketball'
          ? getEventBasketballStats(eventId)
          : sport === 'volleyball'
            ? getEventVolleyballStats(eventId)
            : sport === 'badminton'
              ? getEventBadmintonStats(eventId)
              : Promise.resolve([] as AnyStat[]),
      ]);
      setEvent(eventData);
      setStats(sportStats as AnyStat[]);
      setMatchStartedAt((eventData as any)?.match_started_at || null);
      setMatchEndedAt((eventData as any)?.match_ended_at || null);

      if (sport === 'volleyball') {
        setVballSets(await getVolleyballSets(eventId));
      } else if (sport === 'badminton') {
        setBminGames(await getBadmintonGames(eventId));
      }

      // Phase 2: load action log + derive active set from starters + sub events
      const actionRows = await getEventActions(eventId);
      setActions(actionRows);
      const starterIds = new Set(
        (sportStats as AnyStat[]).filter((s) => (s as any).is_starter).map((s) => s.id),
      );
      const active = new Set(starterIds);
      for (const a of actionRows.sort((x, y) => x.ts.localeCompare(y.ts))) {
        if (!a.stat_id) continue;
        if (a.action_type === 'sub_in') active.add(a.stat_id);
        if (a.action_type === 'sub_out') active.delete(a.stat_id);
      }
      setActiveStatIds(active);

      // Phase 3: derive current quarter from quarter_end events
      const quarterEnds = actionRows.filter((a) => a.action_type === 'quarter_end').length;
      setCurrentQuarter(quarterEnds + 1);

      if (existingScores.length > 0) {
        setEntries(existingScores.map((s: EventScore) => ({ label: s.label, score: s.score })));
      }

      // Load profiles for non-temp players
      const userIds = (sportStats as AnyStat[]).map((s) => s.user_id).filter(Boolean) as string[];
      if (userIds.length > 0) {
        const ps = await getProfilesByIds(userIds);
        setProfiles(ps);
      }
    } catch (e) {
      console.error('載入失敗:', e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Live timer tick — re-render every second while match is running
  useEffect(() => {
    if (!matchStartedAt || matchEndedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [matchStartedAt, matchEndedAt]);

  // Pro mode：若沒陣容，跳到 lineup 頁
  useEffect(() => {
    if (!loading && isPro && stats.length === 0) {
      router.replace({ pathname: '/event/lineup', params: { eventId } });
    }
  }, [loading, isPro, stats.length, eventId, router]);

  // 從 stats 推算隊伍總分
  const teamScores = useMemo(() => {
    if (!isPro || !sportKey || !isProSport(sportKey)) return null;
    const map = new Map<string, number>();
    for (const s of stats) {
      const total = getPlayerTotalPoints(s, sportKey);
      map.set(s.team_label, (map.get(s.team_label) || 0) + total);
    }
    return Array.from(map.entries()).map(([label, score]) => ({ label, score }));
  }, [stats, isPro, sportKey]);

  const teamLabels = useMemo(() => {
    const labels = new Set<string>();
    stats.forEach((s) => labels.add(s.team_label));
    return Array.from(labels);
  }, [stats]);

  // ============================================================
  // Pro mode actions (basketball)
  // ============================================================
  const handlePlayerSelect = (statId: string) => {
    Haptics.selectionAsync();
    setSelectedStatId(selectedStatId === statId ? null : statId);
  };

  const handleAction = async (action: AnyAction) => {
    if (!selectedStatId || !sportKey || !isProSport(sportKey)) {
      toast.error('請先選球員');
      return;
    }
    const stat = stats.find((s) => s.id === selectedStatId);
    if (!stat) return;
    const actions = getActionsForSport(sportKey);
    const meta = actions.find((a) => a.key === action);
    Haptics.impactAsync(
      meta?.tone === 'score' ? Haptics.ImpactFeedbackStyle.Medium
        : meta?.tone === 'negative' ? Haptics.ImpactFeedbackStyle.Soft
        : Haptics.ImpactFeedbackStyle.Light
    );

    setLog((prev) => [
      { id: `${selectedStatId}-${Date.now()}`, stat_id: selectedStatId, action, ts: Date.now() },
      ...prev,
    ].slice(0, 20));

    // First action of the match: stamp start time
    if (!matchStartedAt) {
      const nowIso = new Date().toISOString();
      setMatchStartedAt(nowIso);
      markMatchStarted(eventId).catch(() => {});
    }

    try {
      const updated = await dispatchRecordAction(sportKey, stat, action);
      setStats((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

      // Phase 3: log basketball actions to event_actions for +/- and quarter scoring derivation
      if (sportKey === 'basketball' && meta) {
        const pointsDelta =
          action === 'point_1' ? 1 : action === 'point_2' ? 2 : action === 'point_3' ? 3 : 0;
        const logged = await logAction({
          eventId,
          sport: 'basketball',
          statId: stat.id,
          userId: stat.user_id,
          teamLabel: stat.team_label,
          actionType: action as string,
          pointsDelta,
          quarter: currentQuarter,
        });
        setActions((prev) => [...prev, logged]);
      }

      // Phase 1: per-set scoring for volleyball/badminton
      if (meta?.tone === 'score' && (sportKey === 'volleyball' || sportKey === 'badminton')) {
        const homeLabel = teamLabels[0];
        const awayLabel = teamLabels[1];
        const isHomeScore = stat.team_label === homeLabel;
        if (sportKey === 'volleyball') {
          let openSet = vballSets.find((s) => !s.ended_at);
          if (!openSet && homeLabel && awayLabel) {
            openSet = await openVolleyballSet(eventId, homeLabel, awayLabel);
            setVballSets((prev) => [...prev, openSet!]);
          }
          if (openSet) {
            const next = isHomeScore
              ? { home_score: openSet.home_score + 1 }
              : { away_score: openSet.away_score + 1 };
            await updateVolleyballSetScore(openSet.id, next);
            setVballSets((prev) =>
              prev.map((s) => (s.id === openSet!.id ? { ...s, ...next } : s)),
            );
          }
        } else {
          let openGame = bminGames.find((g) => !g.ended_at);
          if (!openGame && homeLabel && awayLabel) {
            openGame = await openBadmintonGame(eventId, homeLabel, awayLabel);
            setBminGames((prev) => [...prev, openGame!]);
          }
          if (openGame) {
            const next = isHomeScore
              ? { home_score: openGame.home_score + 1 }
              : { away_score: openGame.away_score + 1 };
            await updateBadmintonGameScore(openGame.id, next);
            setBminGames((prev) =>
              prev.map((g) => (g.id === openGame!.id ? { ...g, ...next } : g)),
            );
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || '記錄失敗');
      setLog((prev) => prev.filter((l) => l.stat_id !== selectedStatId || l.ts !== prev[0].ts));
    }
  };

  const openSubModal = (teamLabel: string) => {
    setSubTeam(teamLabel);
    setSubOutStatId(null);
    setSubInStatId(null);
    setSubModalOpen(true);
  };

  const handleSubmitSub = async () => {
    if (!sportKey || !isProSport(sportKey)) return;
    if (!subTeam || (!subOutStatId && !subInStatId)) {
      toast.error('至少選一位球員');
      return;
    }
    const outStat = subOutStatId ? stats.find((s) => s.id === subOutStatId) : null;
    const inStat = subInStatId ? stats.find((s) => s.id === subInStatId) : null;
    try {
      await recordSubstitution({
        eventId,
        sport: sportKey,
        outStatId: subOutStatId,
        outUserId: outStat?.user_id || null,
        inStatId: subInStatId,
        inUserId: inStat?.user_id || null,
        teamLabel: subTeam,
      });
      const outId = subOutStatId;
      const inId = subInStatId;
      setActiveStatIds((prev) => {
        const next = new Set(prev);
        if (outId) next.delete(outId);
        if (inId) next.add(inId);
        return next;
      });
      const updated = await getEventActions(eventId);
      setActions(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || '換人失敗');
    }
  };

  // 重置全部紀錄 — 雙重確認，避免球經誤觸
  const handleResetAll = () => {
    if (!sportKey || !isProSport(sportKey)) return;
    Alert.alert(
      '重置全部紀錄？',
      '所有球員數據、換人紀錄、單局比分都會歸零。陣容會保留。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置...',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — extra friction for an irreversible action
            Alert.alert(
              '再確認一次',
              '比賽資料無法復原。確定要重置嗎？',
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '我確定，全部歸零',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await resetMatchData(eventId, sportKey as 'basketball' | 'volleyball' | 'badminton');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      // Reset local state
                      setMatchStartedAt(null);
                      setMatchEndedAt(null);
                      setVballSets([]);
                      setBminGames([]);
                      setActions([]);
                      setLog([]);
                      setCurrentQuarter(1);
                      setSelectedStatId(null);
                      // Reload from DB so stats reflect fresh state
                      await loadData();
                      toast.success('紀錄已重置');
                    } catch (e: any) {
                      toast.error(e?.message || '重置失敗');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  // 結束本節 (basketball)
  const handleEndQuarter = () => {
    if (sportKey !== 'basketball') return;
    Alert.alert(
      `結束第 ${currentQuarter} 節`,
      `${currentQuarter >= 4 ? '進入延長賽' : `進入第 ${currentQuarter + 1} 節`}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '結束本節',
          onPress: async () => {
            try {
              const homeLabel = teamLabels[0] || '';
              const logged = await logAction({
                eventId,
                sport: 'basketball',
                statId: null,
                userId: null,
                teamLabel: homeLabel,
                actionType: 'quarter_end',
                pointsDelta: 0,
                quarter: currentQuarter,
              });
              setActions((prev) => [...prev, logged]);
              setCurrentQuarter((q) => q + 1);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              toast.error(e.message || '無法結束本節');
            }
          },
        },
      ],
    );
  };

  // 結束本局/開新局 (volleyball / badminton)
  const handleEndCurrentSet = async () => {
    if (sportKey !== 'volleyball' && sportKey !== 'badminton') return;
    const homeLabel = teamLabels[0];
    const awayLabel = teamLabels[1];
    if (!homeLabel || !awayLabel) return;

    if (sportKey === 'volleyball') {
      const open = vballSets.find((s) => !s.ended_at);
      if (!open) return;
      Alert.alert(
        `結束第 ${open.set_number} 局`,
        `${homeLabel} ${open.home_score} - ${open.away_score} ${awayLabel}`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '結束本局',
            onPress: async () => {
              await closeVolleyballSet(open.id);
              setVballSets((prev) =>
                prev.map((s) => (s.id === open.id ? { ...s, ended_at: new Date().toISOString() } : s)),
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    } else {
      const open = bminGames.find((g) => !g.ended_at);
      if (!open) return;
      Alert.alert(
        `結束第 ${open.game_number} 局`,
        `${homeLabel} ${open.home_score} - ${open.away_score} ${awayLabel}`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '結束本局',
            onPress: async () => {
              await closeBadmintonGame(open.id);
              setBminGames((prev) =>
                prev.map((g) => (g.id === open.id ? { ...g, ended_at: new Date().toISOString() } : g)),
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    }
  };

  const handleUndo = async (entry: ActionLog) => {
    if (!sportKey || !isProSport(sportKey)) return;
    const stat = stats.find((s) => s.id === entry.stat_id);
    if (!stat) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    setLog((prev) => prev.filter((l) => l.id !== entry.id));

    try {
      const updated = await dispatchUndoAction(sportKey, stat, entry.action);
      setStats((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e: any) {
      toast.error(e.message || '取消失敗');
    }
  };

  // ============================================================
  // Simple mode actions
  // ============================================================
  const addScoreSimple = (index: number, points: number) => {
    Haptics.impactAsync(
      points >= 3 ? Haptics.ImpactFeedbackStyle.Heavy
        : points >= 2 ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, score: e.score + points } : e)));
  };

  const decrementScoreSimple = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, score: Math.max(0, e.score - 1) } : e)));
  };

  const updateLabel = (index: number, label: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, label } : e)));
  };

  const resetScores = () => {
    Alert.alert('重置比分', '確定要把所有分數歸零嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (isPro) {
            toast.info('Pro 模式請從陣容頁刪除重建');
          } else {
            setEntries((prev) => prev.map((e) => ({ ...e, score: 0 })));
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const finalEntries = isPro && teamScores
        ? teamScores.map((t) => ({ label: t.label, score: t.score }))
        : entries.map((e) => ({ label: e.label.trim(), score: e.score }));
      await saveEventScores(eventId, finalEntries);

      // Close any open set + stamp match end
      if (sportKey === 'volleyball') {
        const open = vballSets.find((s) => !s.ended_at);
        if (open) await closeVolleyballSet(open.id);
      } else if (sportKey === 'badminton') {
        const open = bminGames.find((g) => !g.ended_at);
        if (open) await closeBadmintonGame(open.id);
      }
      if (matchStartedAt && !matchEndedAt) {
        await markMatchEnded(eventId);
        setMatchEndedAt(new Date().toISOString());
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isPro) {
        router.replace({ pathname: '/event/box-score', params: { eventId } });
      } else {
        toast.success('比分已記錄');
        router.back();
      }
    } catch (error: any) {
      toast.error(error.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.fullScreen, { backgroundColor: '#000' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // Render: Pro mode (basketball / volleyball / badminton)
  // ============================================================
  if (isPro && sportKey && isProSport(sportKey) && stats.length > 0) {
    const allActions = getActionsForSport(sportKey);
    const scoreActions = allActions.filter((a) => a.tone === 'score');
    const missActions = allActions.filter((a) => a.tone === 'miss');
    const positiveActions = allActions.filter((a) => a.tone === 'positive');
    const negativeActions = allActions.filter((a) => a.tone === 'negative');

    return (
      <SafeAreaView style={[styles.fullScreen, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
        {/* Top bar with team scores */}
        <View style={styles.proTopBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.topBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IconSymbol name="chevron.left" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.proScoreRow}>
            {teamLabels.map((label, i) => {
              // For volleyball/badminton, the live "team total" shown in pro top bar is the
              // current open set's score, not the cumulative match-long total. That matches
              // FIVB/BWF convention where the on-court display is the running set score.
              let liveScore = 0;
              if (sportKey === 'volleyball') {
                const open = vballSets.find((s) => !s.ended_at);
                liveScore = open ? (i === 0 ? open.home_score : open.away_score) : 0;
              } else if (sportKey === 'badminton') {
                const open = bminGames.find((g) => !g.ended_at);
                liveScore = open ? (i === 0 ? open.home_score : open.away_score) : 0;
              } else {
                liveScore = teamScores?.find((t) => t.label === label)?.score || 0;
              }
              return (
                <View key={label} style={styles.proScoreItem}>
                  <Text style={[styles.proTeamLabel, { color: TEAM_COLORS[i] }]}>{label}</Text>
                  <Text style={styles.proScoreNum}>{liveScore}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={handleResetAll}
              style={[styles.topBtn, { width: 36 }]}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <IconSymbol name="ellipsis" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.topBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              disabled={saving}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
                {saving ? '...' : '結束'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Match meta row: timer + current set / game / quarter */}
        <View style={styles.matchMetaRow}>
          <Text style={styles.matchMetaText}>
            {matchStartedAt
              ? `比賽中 · ${formatMatchDuration(matchStartedAt, matchEndedAt)}`
              : '尚未開始 · 點任一動作即開始'}
          </Text>
          {sportKey === 'basketball' && (
            <Text style={styles.matchMetaText}>
              {currentQuarter <= 4 ? `第 ${currentQuarter} 節` : `延長賽 OT${currentQuarter - 4}`}
            </Text>
          )}
          {sportKey === 'volleyball' && vballSets.length > 0 && (
            <Text style={styles.matchMetaText}>
              第 {vballSets.find((s) => !s.ended_at)?.set_number || vballSets.length} 局 · 局數 {vballSets.filter((s) => s.ended_at && s.home_score > s.away_score).length}-{vballSets.filter((s) => s.ended_at && s.away_score > s.home_score).length}
            </Text>
          )}
          {sportKey === 'badminton' && bminGames.length > 0 && (
            <Text style={styles.matchMetaText}>
              第 {bminGames.find((g) => !g.ended_at)?.game_number || bminGames.length} 局 · 局數 {bminGames.filter((g) => g.ended_at && g.home_score > g.away_score).length}-{bminGames.filter((g) => g.ended_at && g.away_score > g.home_score).length}
            </Text>
          )}
          {(sportKey === 'volleyball' || sportKey === 'badminton') && matchStartedAt && (
            <TouchableOpacity onPress={handleEndCurrentSet} style={styles.endSetBtn} activeOpacity={0.7}>
              <Text style={styles.endSetBtnText}>結束本局</Text>
            </TouchableOpacity>
          )}
          {sportKey === 'basketball' && matchStartedAt && (
            <TouchableOpacity onPress={handleEndQuarter} style={styles.endSetBtn} activeOpacity={0.7}>
              <Text style={styles.endSetBtnText}>結束本節</Text>
            </TouchableOpacity>
          )}
          {/* Suppress unused-var warning for tick — drives the timer re-render */}
          <View style={{ height: 0, width: 0, opacity: 0 }} pointerEvents="none">
            <Text>{tick}</Text>
          </View>
        </View>

        {/* Player rosters per team */}
        <ScrollView style={{ flexGrow: 0 }}>
          {teamLabels.map((label, i) => {
            const teamStats = stats.filter((s) => s.team_label === label);
            // Order: active players first, then bench (still on roster)
            const sorted = [...teamStats].sort((a, b) => {
              const aActive = activeStatIds.has(a.id) ? 0 : 1;
              const bActive = activeStatIds.has(b.id) ? 0 : 1;
              return aActive - bActive;
            });
            return (
              <View key={label} style={styles.rosterSection}>
                <View style={styles.rosterTeamHeader}>
                  <View style={[styles.rosterDot, { backgroundColor: TEAM_COLORS[i] }]} />
                  <Text style={[styles.rosterTeamLabel, { color: TEAM_COLORS[i] }]}>{label}</Text>
                  <TouchableOpacity
                    onPress={() => openSubModal(label)}
                    style={styles.subBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subBtnText}>換人</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rosterRow}
                >
                  {sorted.map((s) => {
                    const name = s.user_id
                      ? getDisplayName(profiles[s.user_id], s.user_id, false)
                      : s.display_name || '';
                    const total = getPlayerTotalPoints(s, sportKey);
                    const selected = selectedStatId === s.id;
                    const isActive = activeStatIds.has(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.playerChip,
                          { borderColor: TEAM_COLORS[i] },
                          selected && { backgroundColor: TEAM_COLORS[i] },
                          !isActive && { opacity: 0.4, borderStyle: 'dashed' },
                        ]}
                        onPress={() => isActive && handlePlayerSelect(s.id)}
                        disabled={!isActive}
                        activeOpacity={0.7}
                      >
                        {s.jersey_number && (
                          <Text style={[styles.jerseyNum, { color: selected ? '#FFF' : TEAM_COLORS[i] }]}>
                            #{s.jersey_number}
                          </Text>
                        )}
                        <Text style={[styles.playerChipName, { color: selected ? '#FFF' : '#FFF' }]} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={[styles.playerChipScore, { color: selected ? '#FFF' : 'rgba(255,255,255,0.5)' }]}>
                          {isActive ? total : '板凳'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionsArea}>
          {/* Score row — biggest, most prominent */}
          {scoreActions.length > 0 && (
            <View style={styles.scoreRow}>
              {scoreActions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[
                    styles.scoreBtn,
                    !selectedStatId && { opacity: 0.35 },
                  ]}
                  onPress={() => handleAction(a.key)}
                  disabled={!selectedStatId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.scoreBtnText} numberOfLines={1}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Miss actions — same layout as score row but dimmer (paired with score) */}
          {missActions.length > 0 && (
            <View style={styles.scoreRow}>
              {missActions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[
                    styles.missBtn,
                    !selectedStatId && { opacity: 0.35 },
                  ]}
                  onPress={() => handleAction(a.key)}
                  disabled={!selectedStatId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.missBtnText} numberOfLines={1}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Positive actions — chip flow */}
          {positiveActions.length > 0 && (
            <View style={styles.chipFlow}>
              {positiveActions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[
                    styles.chipBtn,
                    !selectedStatId && { opacity: 0.35 },
                  ]}
                  onPress={() => handleAction(a.key)}
                  disabled={!selectedStatId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipBtnText}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Negative actions — separated, dimmer */}
          {showSecondary && negativeActions.length > 0 && (
            <View style={styles.chipFlow}>
              {negativeActions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[
                    styles.chipBtn,
                    styles.chipBtnNegative,
                    !selectedStatId && { opacity: 0.35 },
                  ]}
                  onPress={() => handleAction(a.key)}
                  disabled={!selectedStatId}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipBtnText, { color: 'rgba(255,255,255,0.7)' }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {negativeActions.length > 0 && (
            <TouchableOpacity
              style={styles.toggleSecondary}
              onPress={() => setShowSecondary((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                {showSecondary ? '收起失誤/犯規' : '記錄失誤/犯規'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent log — vertical list, newest on top */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>最近紀錄（點擊取消）</Text>
          {log.length === 0 ? (
            <Text style={styles.logEmpty}>尚無紀錄</Text>
          ) : (
            <ScrollView style={styles.logList} showsVerticalScrollIndicator={false}>
              {log.map((entry, i) => {
                const stat = stats.find((s) => s.id === entry.stat_id);
                if (!stat) return null;
                const name = stat.user_id
                  ? getDisplayName(profiles[stat.user_id], stat.user_id, false)
                  : stat.display_name || '';
                const label = getActionLabel(sportKey, entry.action);
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.logRowItem, i === 0 && styles.logRowLatest]}
                    onPress={() => handleUndo(entry)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="arrow.uturn.backward" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.logRowText} numberOfLines={1}>
                      {name} · {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Substitution modal */}
        <Modal
          visible={subModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSubModalOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSubModalOpen(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>換人 · {subTeam || ''}</Text>
              <Text style={styles.modalHint}>選下場、上場（任一邊或兩邊都選）</Text>

              <View style={styles.subColumnsRow}>
                {/* On-court column */}
                <View style={styles.subColumn}>
                  <Text style={styles.subColumnLabel}>在場</Text>
                  <ScrollView style={styles.subColumnScroll}>
                    {(() => {
                      const onCourt = stats.filter((s) => s.team_label === subTeam && activeStatIds.has(s.id));
                      if (onCourt.length === 0) {
                        return (
                          <Text style={styles.subEmptyHint}>無人在場</Text>
                        );
                      }
                      return onCourt.map((s) => {
                        const name = s.user_id
                          ? getDisplayName(profiles[s.user_id], s.user_id, false)
                          : s.display_name || '';
                        const picked = subOutStatId === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.subPlayerRow,
                              picked && styles.subPlayerRowOut,
                            ]}
                            onPress={() => setSubOutStatId(picked ? null : s.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.subPlayerName, picked && { color: '#FFF' }]}>
                              {s.jersey_number ? `#${s.jersey_number} ` : ''}{name}
                            </Text>
                            {picked && <Text style={styles.subPickIcon}>↓</Text>}
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>

                {/* Bench column */}
                <View style={styles.subColumn}>
                  <Text style={styles.subColumnLabel}>板凳</Text>
                  <ScrollView style={styles.subColumnScroll}>
                    {(() => {
                      const bench = stats.filter((s) => s.team_label === subTeam && !activeStatIds.has(s.id));
                      if (bench.length === 0) {
                        return (
                          <Text style={styles.subEmptyHint}>板凳沒人</Text>
                        );
                      }
                      return bench.map((s) => {
                        const name = s.user_id
                          ? getDisplayName(profiles[s.user_id], s.user_id, false)
                          : s.display_name || '';
                        const picked = subInStatId === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.subPlayerRow,
                              picked && styles.subPlayerRowIn,
                            ]}
                            onPress={() => setSubInStatId(picked ? null : s.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.subPlayerName, picked && { color: '#FFF' }]}>
                              {s.jersey_number ? `#${s.jersey_number} ` : ''}{name}
                            </Text>
                            {picked && <Text style={styles.subPickIcon}>↑</Text>}
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.subActionRow}>
                <TouchableOpacity
                  style={styles.subCancel}
                  onPress={() => setSubModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.subConfirm,
                    (!subOutStatId && !subInStatId) && { opacity: 0.4 },
                  ]}
                  onPress={handleSubmitSub}
                  disabled={!subOutStatId && !subInStatId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subConfirmText}>
                    {subOutStatId && subInStatId
                      ? '確認換人'
                      : subInStatId
                        ? '上場'
                        : subOutStatId
                          ? '下場'
                          : '選擇球員'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  // ============================================================
  // Render: Simple mode (volleyball, badminton, etc.)
  // ============================================================
  return (
    <SafeAreaView style={[styles.fullScreen, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.topBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconSymbol name="chevron.left" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {event?.title || '記錄比分'}
          </Text>
          <Text style={styles.topSport}>{sportConfig.label}</Text>
        </View>
        <TouchableOpacity
          onPress={resetScores}
          style={styles.topBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconSymbol name="arrow.clockwise" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      <View style={styles.scoreboard}>
        {entries.map((entry, index) => (
          <View key={index} style={[styles.teamHalf, { backgroundColor: TEAM_COLORS[index] }]}>
            <TouchableOpacity
              onPress={() => setEditingLabel(index)}
              activeOpacity={0.8}
              style={styles.teamNameArea}
            >
              {editingLabel === index ? (
                <TextInput
                  style={styles.teamNameInput}
                  value={entry.label}
                  onChangeText={(val) => updateLabel(index, val)}
                  onBlur={() => setEditingLabel(null)}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.teamName}>{entry.label}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scoreArea}
              onPress={() => addScoreSimple(index, primaryPoints)}
              onLongPress={() => decrementScoreSimple(index)}
              delayLongPress={400}
              activeOpacity={0.85}
            >
              <Text style={styles.scoreNumber}>{entry.score}</Text>
              <Text style={styles.tapHint}>點擊 +{primaryPoints}　長按 −1</Text>
            </TouchableOpacity>

            {secondaryButtons.length > 0 && (
              <View style={styles.secondaryRow}>
                {secondaryButtons.map((pts) => (
                  <TouchableOpacity
                    key={pts}
                    style={styles.secondaryBtn}
                    onPress={() => addScoreSimple(index, pts)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryBtnText}>+{pts}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>{saving ? '處理中...' : '結束比賽'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  topBtn: { width: 60, height: 44, alignItems: 'center', justifyContent: 'center' },
  topCenter: { alignItems: 'center', flex: 1 },
  topTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
  topSport: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 1 },

  // Pro top bar
  proTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  proScoreRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl },
  proScoreItem: { alignItems: 'center' },
  proTeamLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  proScoreNum: { color: '#FFF', fontSize: 36, fontWeight: '800', letterSpacing: -1 },

  // Match meta (timer + set indicator + end-set button)
  matchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  matchMetaText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontVariant: ['tabular-nums'] },
  endSetBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  endSetBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Roster
  rosterSection: { paddingVertical: Spacing.sm },
  rosterTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  rosterDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  rosterTeamLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, flex: 1 },
  subBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  subBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  // Substitution modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: '#111',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: Spacing.md },
  subColumnsRow: { flexDirection: 'row', gap: Spacing.md, minHeight: 200 },
  subColumn: { flex: 1 },
  subColumnLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  subColumnScroll: { maxHeight: 280 },
  subPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.sm,
    marginBottom: 4,
  },
  subPlayerRowOut: {
    backgroundColor: '#DC2626',
  },
  subPlayerRowIn: {
    backgroundColor: '#16A34A',
  },
  subPlayerName: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  subEmptyHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
  subPickIcon: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  subActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  subCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  subCancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  subConfirm: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  subConfirmText: { color: '#000', fontSize: 14, fontWeight: '700' },
  rosterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  playerChip: {
    minWidth: 80,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  jerseyNum: { fontSize: 11, fontWeight: '700' },
  playerChipName: { fontSize: 13, fontWeight: '600', maxWidth: 80 },
  playerChipScore: { fontSize: 16, fontWeight: '800' },

  // Actions
  actionsArea: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  scoreRow: {
    flexDirection: 'row', gap: Spacing.sm,
  },
  scoreBtn: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: Radius.md,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  missBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  chipFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chipBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.13)',
    minWidth: 80,
    alignItems: 'center',
  },
  chipBtnNegative: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  toggleSecondary: { paddingVertical: Spacing.sm, alignItems: 'center' },

  // Log (vertical, newest on top)
  logSection: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  logTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  logEmpty: { color: 'rgba(255,255,255,0.3)', fontSize: 12, paddingVertical: Spacing.xs },
  logList: { flex: 1 },
  logRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  logRowLatest: {
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  logRowText: { color: '#FFF', fontSize: 13, fontWeight: '500', flex: 1 },

  // Simple mode
  scoreboard: { flex: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 4, marginBottom: 4 },
  teamHalf: { flex: 1, borderRadius: Radius.lg, alignItems: 'center', overflow: 'hidden' },
  teamNameArea: {
    width: '100%', paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  teamName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  teamNameInput: {
    color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center', padding: 0, minWidth: 80,
  },
  scoreArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { color: '#FFFFFF', fontSize: 88, fontWeight: '800', letterSpacing: -3 },
  tapHint: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: Spacing.sm },
  secondaryRow: {
    flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md, backgroundColor: 'rgba(0,0,0,0.15)',
    width: '100%', justifyContent: 'center',
  },
  secondaryBtn: {
    flex: 1, paddingVertical: Spacing.lg, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center',
  },
  secondaryBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  bottomBar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  saveButton: {
    backgroundColor: '#FFF', paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center',
  },
  saveText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
