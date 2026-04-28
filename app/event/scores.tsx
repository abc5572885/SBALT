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
  getMatchBadmintonGames,
  getMatchVolleyballSets,
  openBadmintonGame,
  openVolleyballSet,
  resetMatchData,
  updateBadmintonGameScore,
  updateVolleyballSetScore,
} from '@/services/matchTime';
import {
  ActionRow,
  deleteAction,
  getMatchActions,
  logAction,
  recordSubstitution,
} from '@/services/eventActions';
import {
  Match,
  finishMatch,
  getMatchById,
  markMatchStarted as markEventMatchStarted,
} from '@/services/matches';
import { TimeoutOverlay } from '@/components/TimeoutOverlay';
import {
  BasketballStat,
  VolleyballStat,
  BadmintonStat,
  getMatchBasketballStats,
  getMatchVolleyballStats,
  getMatchBadmintonStats,
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
  Switch,
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
  /** Server-side event_actions row id, set after the log call resolves. */
  eventActionId?: string;
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
  const { eventId, matchId } = useLocalSearchParams<{ eventId: string; matchId?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [event, setEvent] = useState<Event | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
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
  const [subOutIds, setSubOutIds] = useState<Set<string>>(new Set());
  const [subInIds, setSubInIds] = useState<Set<string>>(new Set());
  const [subsThisSession, setSubsThisSession] = useState(0);

  // Phase 3: basketball quarter tracking (1, 2, 3, 4, 5+ for OT)
  const [currentQuarter, setCurrentQuarter] = useState(1);

  // Phase 5: basketball game clock + shot clock
  const QUARTER_LENGTH_DEFAULT = 600; // 10 min
  const [quarterLengthSec, setQuarterLengthSec] = useState(QUARTER_LENGTH_DEFAULT);
  const [gameClockSec, setGameClockSec] = useState(QUARTER_LENGTH_DEFAULT);
  const [gameClockRunning, setGameClockRunning] = useState(false);
  const [shotClockEnabled, setShotClockEnabled] = useState(false);
  const [shotClockMaxSec, setShotClockMaxSec] = useState(24);
  const [shotClockSec, setShotClockSec] = useState(24);
  const [shotClockRunning, setShotClockRunning] = useState(false);
  const [clockSettingsOpen, setClockSettingsOpen] = useState(false);

  // Phase 5b: timeout/break overlay for volleyball / badminton
  const [timeout_, setTimeout_] = useState<{ seconds: number; label: string } | null>(null);

  const sportConfig = getSportConfig(event?.sport_type);
  const sportKey = event?.sport_type;
  const isPro = isProSport(sportKey);
  const buttons = sportConfig.scoreButtons;
  const primaryPoints = buttons.length >= 2 ? 2 : (buttons[0] || 1);
  const secondaryButtons = buttons.filter((b) => b !== primaryPoints);

  const loadData = useCallback(async () => {
    if (!eventId || !matchId) return;
    try {
      const [eventData, matchData] = await Promise.all([
        getEventById(eventId),
        getMatchById(matchId),
      ]);
      const sport = eventData?.sport_type;
      const [existingScores, sportStats] = await Promise.all([
        getEventScores(eventId),
        sport === 'basketball'
          ? getMatchBasketballStats(matchId)
          : sport === 'volleyball'
            ? getMatchVolleyballStats(matchId)
            : sport === 'badminton'
              ? getMatchBadmintonStats(matchId)
              : Promise.resolve([] as AnyStat[]),
      ]);
      setEvent(eventData);
      setMatch(matchData);
      setStats(sportStats as AnyStat[]);
      setMatchStartedAt(matchData?.started_at || null);
      setMatchEndedAt(matchData?.ended_at || null);

      if (sport === 'volleyball') {
        setVballSets(await getMatchVolleyballSets(matchId));
      } else if (sport === 'badminton') {
        setBminGames(await getMatchBadmintonGames(matchId));
      }

      // Phase 2: load action log + derive active set from starters + sub events
      const actionRows = await getMatchActions(matchId);
      setActions(actionRows);
      const starterIds = new Set(
        (sportStats as AnyStat[]).filter((s) => (s as any).is_starter).map((s) => s.id),
      );
      const hasSubEvents = actionRows.some(
        (a) => a.action_type === 'sub_in' || a.action_type === 'sub_out',
      );
      // Fallback: if the lineup was saved without any starters and no sub events
      // have happened yet, treat everyone as on court so the recorder can start
      // recording without needing to bring people on via the sub modal.
      const baseSet =
        starterIds.size === 0 && !hasSubEvents
          ? new Set((sportStats as AnyStat[]).map((s) => s.id))
          : starterIds;
      const active = new Set(baseSet);
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
  }, [eventId, matchId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Live timer tick — re-render every second while match is running
  useEffect(() => {
    if (!matchStartedAt || matchEndedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [matchStartedAt, matchEndedAt]);

  // Phase 5: game clock + shot clock tick (drift-corrected)
  useEffect(() => {
    if (!gameClockRunning && !shotClockRunning) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      if (gameClockRunning) {
        setGameClockSec((s) => {
          const next = Math.max(0, s - delta);
          if (next <= 0 && s > 0) {
            setGameClockRunning(false);
            setShotClockRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          return next;
        });
      }
      if (shotClockRunning) {
        setShotClockSec((s) => {
          const next = Math.max(0, s - delta);
          if (next <= 0 && s > 0) {
            setShotClockRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return next;
        });
      }
    }, 250);
    return () => clearInterval(id);
  }, [gameClockRunning, shotClockRunning]);

  // Pro mode：若沒陣容，跳到 lineup 頁
  useEffect(() => {
    if (!loading && isPro && stats.length === 0) {
      router.replace({
        pathname: '/event/lineup',
        params: matchId ? { eventId, matchId } : { eventId },
      });
    }
  }, [loading, isPro, stats.length, eventId, matchId, router]);

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

    const localLogId = `${selectedStatId}-${Date.now()}`;
    setLog((prev) => [
      { id: localLogId, stat_id: selectedStatId, action, ts: Date.now() },
      ...prev,
    ].slice(0, 20));

    // First action of the match: stamp start time
    if (!matchStartedAt && matchId) {
      const nowIso = new Date().toISOString();
      setMatchStartedAt(nowIso);
      markEventMatchStarted(matchId).catch(() => {});
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
          matchId,
          sport: 'basketball',
          statId: stat.id,
          userId: stat.user_id,
          teamLabel: stat.team_label,
          actionType: action as string,
          pointsDelta,
          quarter: currentQuarter,
        });
        setActions((prev) => [...prev, logged]);
        // Patch local log entry with server uuid so undo can delete it
        setLog((prev) =>
          prev.map((e) => (e.id === localLogId ? { ...e, eventActionId: logged.id } : e)),
        );
      }

      // Phase 1: per-set scoring for volleyball/badminton
      if (meta?.tone === 'score' && (sportKey === 'volleyball' || sportKey === 'badminton')) {
        const homeLabel = teamLabels[0];
        const awayLabel = teamLabels[1];
        const isHomeScore = stat.team_label === homeLabel;
        if (sportKey === 'volleyball') {
          let openSet = vballSets.find((s) => !s.ended_at);
          if (!openSet && homeLabel && awayLabel) {
            openSet = await openVolleyballSet(eventId, homeLabel, awayLabel, matchId);
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
            openGame = await openBadmintonGame(eventId, homeLabel, awayLabel, matchId);
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
    setSubOutIds(new Set());
    setSubInIds(new Set());
    setSubsThisSession(0);
    setSubModalOpen(true);
  };

  const toggleSubOut = (statId: string) => {
    setSubOutIds((prev) => {
      const next = new Set(prev);
      if (next.has(statId)) next.delete(statId);
      else next.add(statId);
      return next;
    });
  };

  const toggleSubIn = (statId: string) => {
    setSubInIds((prev) => {
      const next = new Set(prev);
      if (next.has(statId)) next.delete(statId);
      else next.add(statId);
      return next;
    });
  };

  const handleSubmitSub = async () => {
    if (!sportKey || !isProSport(sportKey)) return;
    if (!subTeam || (subOutIds.size === 0 && subInIds.size === 0)) {
      toast.error('至少選一位球員');
      return;
    }
    // First interaction (sub or score) marks the match started.
    // Without this, sub_in events end up earlier than match.started_at
    // and MIN drifts above 比賽時長.
    if (!matchStartedAt && matchId) {
      const nowIso = new Date().toISOString();
      setMatchStartedAt(nowIso);
      markEventMatchStarted(matchId).catch(() => {});
    }
    const outs = Array.from(subOutIds)
      .map((id) => {
        const s = stats.find((x) => x.id === id);
        return s ? { statId: id, userId: s.user_id } : null;
      })
      .filter(Boolean) as { statId: string; userId: string | null }[];
    const ins = Array.from(subInIds)
      .map((id) => {
        const s = stats.find((x) => x.id === id);
        return s ? { statId: id, userId: s.user_id } : null;
      })
      .filter(Boolean) as { statId: string; userId: string | null }[];
    try {
      await recordSubstitution({
        eventId,
        matchId,
        sport: sportKey,
        teamLabel: subTeam,
        outs,
        ins,
      });
      const outIds = Array.from(subOutIds);
      const inIds = Array.from(subInIds);
      setActiveStatIds((prev) => {
        const next = new Set(prev);
        outIds.forEach((id) => next.delete(id));
        inIds.forEach((id) => next.add(id));
        return next;
      });
      const updated = matchId ? await getMatchActions(matchId) : [];
      setActions(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Multi-sub session: clear selection, keep modal open
      setSubOutIds(new Set());
      setSubInIds(new Set());
      setSubsThisSession((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message || '換人失敗');
    }
  };

  // ── Game clock helpers ───────────────────────────
  const formatClock = (sec: number): string => {
    const total = Math.max(0, Math.ceil(sec));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const toggleGameClock = () => {
    if (gameClockSec <= 0) return;
    Haptics.selectionAsync();
    if (gameClockRunning) {
      setGameClockRunning(false);
      setShotClockRunning(false);
    } else {
      setGameClockRunning(true);
      if (shotClockEnabled) {
        if (shotClockSec <= 0) setShotClockSec(shotClockMaxSec);
        setShotClockRunning(true);
      }
    }
  };

  const editGameClock = () => {
    Alert.alert(
      '微調本節時間',
      `目前剩餘 ${formatClock(gameClockSec)}`,
      [
        { text: '+1 分', onPress: () => setGameClockSec((s) => Math.min(quarterLengthSec, s + 60)) },
        { text: '+10 秒', onPress: () => setGameClockSec((s) => Math.min(quarterLengthSec, s + 10)) },
        { text: '−10 秒', onPress: () => setGameClockSec((s) => Math.max(0, s - 10)) },
        { text: '−1 分', onPress: () => setGameClockSec((s) => Math.max(0, s - 60)) },
        { text: '重置本節', onPress: () => setGameClockSec(quarterLengthSec), style: 'destructive' },
        { text: '取消', style: 'cancel' },
      ],
    );
  };

  const resetShotClockMax = () => {
    Haptics.selectionAsync();
    setShotClockSec(shotClockMaxSec);
    if (gameClockRunning) setShotClockRunning(true);
  };

  const resetShotClockTo14 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShotClockSec(14);
    if (gameClockRunning) setShotClockRunning(true);
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
                    if (!matchId) return;
                    try {
                      await resetMatchData(matchId, sportKey as 'basketball' | 'volleyball' | 'badminton');
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
                matchId,
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
              // Reset clocks for next quarter
              setGameClockRunning(false);
              setShotClockRunning(false);
              setGameClockSec(quarterLengthSec);
              setShotClockSec(shotClockMaxSec);
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
      // Also delete the event_actions row so quarter scoring & +/- stay in sync
      if (entry.eventActionId) {
        await deleteAction(entry.eventActionId).catch(() => {});
        setActions((prev) => prev.filter((a) => a.id !== entry.eventActionId));
      }
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
      if (matchStartedAt && !matchEndedAt && matchId) {
        await finishMatch(matchId);
        setMatchEndedAt(new Date().toISOString());
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isPro) {
        router.replace({
          pathname: '/event/box-score',
          params: matchId ? { eventId, matchId } : { eventId },
        });
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

    const liveScoreFor = (i: number, label: string): number => {
      if (sportKey === 'volleyball') {
        const open = vballSets.find((s) => !s.ended_at);
        return open ? (i === 0 ? open.home_score : open.away_score) : 0;
      }
      if (sportKey === 'badminton') {
        const open = bminGames.find((g) => !g.ended_at);
        return open ? (i === 0 ? open.home_score : open.away_score) : 0;
      }
      return teamScores?.find((t) => t.label === label)?.score || 0;
    };

    const selectedStat = selectedStatId ? stats.find((s) => s.id === selectedStatId) : null;
    const selectedTeamIdx = selectedStat ? teamLabels.indexOf(selectedStat.team_label) : -1;
    const selectedName = selectedStat
      ? selectedStat.user_id
        ? getDisplayName(profiles[selectedStat.user_id], selectedStat.user_id, false)
        : selectedStat.display_name || ''
      : '';

    return (
      <SafeAreaView style={[styles.fullScreen, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
        {/* ═══ HEADER (compact: nav + scores + utility) ═══ */}
        <View style={styles.headerV2}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="chevron.left" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerScoreRow}>
            {teamLabels.map((label, i) => (
              <React.Fragment key={label}>
                <View style={styles.headerScoreCol}>
                  <Text style={[styles.headerTeamLabel, { color: TEAM_COLORS[i] }]} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.headerScoreNum}>{liveScoreFor(i, label)}</Text>
                </View>
                {i === 0 && <Text style={styles.headerScoreSep}>—</Text>}
              </React.Fragment>
            ))}
          </View>
          <TouchableOpacity onPress={handleResetAll} style={styles.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <IconSymbol name="ellipsis" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.headerEndBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }} disabled={saving}>
            <Text style={styles.headerEndText}>{saving ? '...' : '結束'}</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ CLOCK / META ROW (sport-specific) ═══ */}
        {sportKey === 'basketball' ? (
          <View style={styles.clockBar}>
            <View style={styles.quarterPill}>
              <Text style={styles.quarterText}>
                {currentQuarter <= 4 ? `Q${currentQuarter}` : `OT${currentQuarter - 4}`}
              </Text>
            </View>
            <Pressable
              onPress={toggleGameClock}
              onLongPress={editGameClock}
              style={[styles.gameClockCompact, gameClockRunning && styles.gameClockActive]}
            >
              <Text style={styles.gameClockCompactText}>{formatClock(gameClockSec)}</Text>
              <View style={[styles.gameClockDot, gameClockRunning && { backgroundColor: '#22C55E' }]} />
            </Pressable>
            {shotClockEnabled && (
              <Pressable
                onPress={resetShotClockMax}
                onLongPress={resetShotClockTo14}
                style={[
                  styles.shotClock,
                  shotClockSec <= 5 && styles.shotClockUrgent,
                  shotClockSec <= 0 && styles.shotClockExpired,
                ]}
              >
                <Text style={styles.shotClockText}>{Math.ceil(shotClockSec)}</Text>
              </Pressable>
            )}
            <TouchableOpacity onPress={() => setClockSettingsOpen(true)} style={styles.iconBtn}>
              <IconSymbol name="gearshape.fill" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            {matchStartedAt && (
              <TouchableOpacity onPress={handleEndQuarter} style={styles.endSetBtn} activeOpacity={0.7}>
                <Text style={styles.endSetBtnText}>結束本節</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.clockBar}>
            <Text style={styles.clockBarHint}>
              {matchStartedAt
                ? formatMatchDuration(matchStartedAt, matchEndedAt)
                : '點任一動作即開始'}
            </Text>
            {sportKey === 'volleyball' && vballSets.length > 0 && (
              <Text style={styles.clockBarMeta}>
                第 {vballSets.find((s) => !s.ended_at)?.set_number || vballSets.length} 局 · {vballSets.filter((s) => s.ended_at && s.home_score > s.away_score).length}-{vballSets.filter((s) => s.ended_at && s.away_score > s.home_score).length}
              </Text>
            )}
            {sportKey === 'badminton' && bminGames.length > 0 && (
              <Text style={styles.clockBarMeta}>
                第 {bminGames.find((g) => !g.ended_at)?.game_number || bminGames.length} 局 · {bminGames.filter((g) => g.ended_at && g.home_score > g.away_score).length}-{bminGames.filter((g) => g.ended_at && g.away_score > g.home_score).length}
              </Text>
            )}
            {sportKey === 'volleyball' && matchStartedAt && (
              <TouchableOpacity
                onPress={() => setTimeout_({ seconds: 30, label: '暫停 30 秒' })}
                style={styles.endSetBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.endSetBtnText}>暫停 30s</Text>
              </TouchableOpacity>
            )}
            {sportKey === 'badminton' && matchStartedAt && (
              <>
                <TouchableOpacity
                  onPress={() => setTimeout_({ seconds: 60, label: '局中休息 60 秒' })}
                  style={styles.endSetBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.endSetBtnText}>局中 60s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTimeout_({ seconds: 120, label: '局間休息 120 秒' })}
                  style={styles.endSetBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.endSetBtnText}>局間 120s</Text>
                </TouchableOpacity>
              </>
            )}
            {(sportKey === 'volleyball' || sportKey === 'badminton') && matchStartedAt && (
              <TouchableOpacity onPress={handleEndCurrentSet} style={styles.endSetBtn} activeOpacity={0.7}>
                <Text style={styles.endSetBtnText}>結束本局</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 0, width: 0, opacity: 0 }} pointerEvents="none">
              <Text>{tick}</Text>
            </View>
          </View>
        )}

        {/* ═══ ROSTER PANE (two columns, vertical lists) ═══ */}
        <View style={styles.rosterPane}>
          {teamLabels.map((label, i) => {
            const teamStats = stats.filter((s) => s.team_label === label);
            const active = teamStats.filter((s) => activeStatIds.has(s.id));
            const bench = teamStats.filter((s) => !activeStatIds.has(s.id));
            return (
              <View
                key={label}
                style={[
                  styles.rosterColumn,
                  i === 0 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.1)' },
                ]}
              >
                <View style={styles.rosterColHeader}>
                  <View style={[styles.rosterColDot, { backgroundColor: TEAM_COLORS[i] }]} />
                  <Text style={[styles.rosterColLabel, { color: TEAM_COLORS[i] }]} numberOfLines={1}>
                    {label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => openSubModal(label)}
                    style={styles.rosterSubBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rosterSubBtnText}>換人</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.rosterScroll} showsVerticalScrollIndicator={false}>
                  {active.map((s) => {
                    const name = s.user_id
                      ? getDisplayName(profiles[s.user_id], s.user_id, false)
                      : s.display_name || '';
                    const total = getPlayerTotalPoints(s, sportKey);
                    const selected = selectedStatId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.rosterPlayerRow,
                          selected && {
                            backgroundColor: TEAM_COLORS[i] + '22',
                            borderLeftColor: TEAM_COLORS[i],
                          },
                        ]}
                        onPress={() => handlePlayerSelect(s.id)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.rosterJersey,
                            { color: TEAM_COLORS[i] },
                          ]}
                        >
                          {s.jersey_number ? `#${s.jersey_number}` : '·'}
                        </Text>
                        <Text style={styles.rosterName} numberOfLines={1}>{name}</Text>
                        <Text style={styles.rosterScoreNum}>{total}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {bench.length > 0 && (
                    <TouchableOpacity
                      style={styles.benchBar}
                      onPress={() => openSubModal(label)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.benchBarText}>板凳 {bench.length} 人 →</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            );
          })}
        </View>

        {/* ═══ SELECTED PLAYER bar (always visible above actions) ═══ */}
        <View style={styles.selectedBar}>
          {selectedStat ? (
            <>
              <View style={[styles.selectedDot, { backgroundColor: TEAM_COLORS[selectedTeamIdx] }]} />
              <Text style={styles.selectedJersey}>
                {selectedStat.jersey_number ? `#${selectedStat.jersey_number}` : ''}
              </Text>
              <Text style={styles.selectedName} numberOfLines={1}>{selectedName}</Text>
              <Text style={styles.selectedTeamHint}>· {selectedStat.team_label}</Text>
              <TouchableOpacity
                onPress={() => setSelectedStatId(null)}
                style={styles.selectedClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="xmark" size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.selectedHint}>↑ 選一位球員開始記錄</Text>
          )}
        </View>

        {/* ═══ ACTIONS (paired score/miss columns + stat chips) ═══ */}
        <ScrollView style={styles.actionsAreaV2} contentContainerStyle={{ paddingBottom: Spacing.md }}>
          {/* Paired scoring section */}
          {scoreActions.length > 0 && (
            <View style={styles.pairedRow}>
              {scoreActions.map((scoreAct, idx) => {
                const missAct = missActions[idx];
                const title = scoreAct.label.replace(/進$/, '').replace(/得分$/, '').trim();
                return (
                  <View key={scoreAct.key} style={styles.pairedColumn}>
                    <Text style={styles.pairedColumnTitle}>{title}</Text>
                    <TouchableOpacity
                      style={[styles.scoreCell, !selectedStatId && { opacity: 0.35 }]}
                      onPress={() => handleAction(scoreAct.key)}
                      disabled={!selectedStatId}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.scoreCellText}>進</Text>
                    </TouchableOpacity>
                    {missAct && (
                      <TouchableOpacity
                        style={[styles.missCell, !selectedStatId && { opacity: 0.35 }]}
                        onPress={() => handleAction(missAct.key)}
                        disabled={!selectedStatId}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.missCellText}>未進</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Stats chips (positive non-scoring) */}
          {positiveActions.length > 0 && (
            <View style={styles.chipFlow}>
              {positiveActions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.chipBtn, !selectedStatId && { opacity: 0.35 }]}
                  onPress={() => handleAction(a.key)}
                  disabled={!selectedStatId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipBtnText}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Negative section (collapsed) */}
          {negativeActions.length > 0 && (
            <>
              {showSecondary && (
                <View style={styles.chipFlow}>
                  {negativeActions.map((a) => (
                    <TouchableOpacity
                      key={a.key}
                      style={[styles.chipBtn, styles.chipBtnNegative, !selectedStatId && { opacity: 0.35 }]}
                      onPress={() => handleAction(a.key)}
                      disabled={!selectedStatId}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipBtnText, { color: 'rgba(255,255,255,0.7)' }]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.toggleSecondary}
                onPress={() => setShowSecondary((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {showSecondary ? '收起失誤/犯規' : '記錄失誤/犯規'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

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
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>換人 · {subTeam || ''}</Text>
                {subsThisSession > 0 && (
                  <Text style={styles.modalCount}>已執行 {subsThisSession} 批</Text>
                )}
              </View>
              <Text style={styles.modalHint}>多選 · 點選任意人數 → 確認</Text>

              <View style={styles.subColumnsRow}>
                {/* On-court column */}
                <View style={styles.subColumn}>
                  <Text style={styles.subColumnLabel}>
                    在場 {subOutIds.size > 0 ? `· 選 ${subOutIds.size}` : ''}
                  </Text>
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
                        const picked = subOutIds.has(s.id);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.subPlayerRow,
                              picked && styles.subPlayerRowOut,
                            ]}
                            onPress={() => toggleSubOut(s.id)}
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
                  <Text style={styles.subColumnLabel}>
                    板凳 {subInIds.size > 0 ? `· 選 ${subInIds.size}` : ''}
                  </Text>
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
                        const picked = subInIds.has(s.id);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.subPlayerRow,
                              picked && styles.subPlayerRowIn,
                            ]}
                            onPress={() => toggleSubIn(s.id)}
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
                  <Text style={styles.subCancelText}>
                    {subsThisSession > 0 ? '完成' : '取消'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.subConfirm,
                    (subOutIds.size === 0 && subInIds.size === 0) && { opacity: 0.4 },
                  ]}
                  onPress={handleSubmitSub}
                  disabled={subOutIds.size === 0 && subInIds.size === 0}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subConfirmText}>
                    {subOutIds.size > 0 && subInIds.size > 0
                      ? `換 ${Math.max(subOutIds.size, subInIds.size)} 人`
                      : subInIds.size > 0
                        ? `${subInIds.size} 人上場`
                        : subOutIds.size > 0
                          ? `${subOutIds.size} 人下場`
                          : '選擇球員'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Clock settings modal (basketball) */}
        <Modal
          visible={clockSettingsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setClockSettingsOpen(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setClockSettingsOpen(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>計時器設定</Text>

              <Text style={styles.settingsLabel}>單節時間</Text>
              <View style={styles.settingsBtnRow}>
                {[8, 10, 12].map((m) => {
                  const active = quarterLengthSec === m * 60;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.settingsBtn, active && styles.settingsBtnActive]}
                      onPress={() => {
                        setQuarterLengthSec(m * 60);
                        if (!gameClockRunning) setGameClockSec(m * 60);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.settingsBtnText,
                          active && { color: '#000' },
                        ]}
                      >
                        {m} 分
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.settingsToggleRow}>
                <Text style={styles.settingsLabel}>進攻時限（24/14 秒）</Text>
                <Switch
                  value={shotClockEnabled}
                  onValueChange={(v) => {
                    setShotClockEnabled(v);
                    if (v) setShotClockSec(shotClockMaxSec);
                    else setShotClockRunning(false);
                  }}
                />
              </View>

              {shotClockEnabled && (
                <>
                  <Text style={styles.settingsLabel}>時限上限</Text>
                  <View style={styles.settingsBtnRow}>
                    {[24, 30].map((s) => {
                      const active = shotClockMaxSec === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.settingsBtn, active && styles.settingsBtnActive]}
                          onPress={() => {
                            setShotClockMaxSec(s);
                            setShotClockSec(s);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.settingsBtnText,
                              active && { color: '#000' },
                            ]}
                          >
                            {s} 秒
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.settingsHint}>
                    Tap shot clock 重置為 {shotClockMaxSec} 秒・長按重置為 14 秒（進攻籃板）
                  </Text>
                </>
              )}

              <TouchableOpacity
                style={[styles.subConfirm, { marginTop: Spacing.lg }]}
                onPress={() => setClockSettingsOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.subConfirmText}>完成</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Volleyball / badminton timeout overlay */}
        <TimeoutOverlay
          visible={!!timeout_}
          seconds={timeout_?.seconds || 0}
          label={timeout_?.label || ''}
          onClose={() => setTimeout_(null)}
        />
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

  // Basketball clock row
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  quarterPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  quarterText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  gameClock: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  gameClockActive: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderColor: 'rgba(34,197,94,0.6)',
  },
  gameClockText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  gameClockHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    marginTop: 2,
  },
  shotClock: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(220,38,38,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotClockUrgent: {
    backgroundColor: '#DC2626',
  },
  shotClockExpired: {
    backgroundColor: '#7F1D1D',
  },
  shotClockText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSetBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  endSetBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // ─── V2 Layout (Plan B rework) ──────────────────────────
  headerV2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerScoreRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  headerScoreCol: { alignItems: 'center', minWidth: 80 },
  headerTeamLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  headerScoreNum: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    lineHeight: 36,
  },
  headerScoreSep: { color: 'rgba(255,255,255,0.3)', fontSize: 22, fontWeight: '300' },
  headerEndBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  headerEndText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  clockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexWrap: 'wrap',
  },
  clockBarHint: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontVariant: ['tabular-nums'] },
  clockBarMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },
  gameClockCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  gameClockCompactText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  gameClockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Two-column roster pane
  rosterPane: {
    flexDirection: 'row',
    height: 200,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rosterColumn: { flex: 1, paddingVertical: Spacing.sm },
  rosterColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  rosterColDot: { width: 7, height: 7, borderRadius: 3.5 },
  rosterColLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  rosterSubBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rosterSubBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' },
  rosterScroll: { flex: 1 },
  rosterPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 8,
  },
  rosterJersey: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 24,
    fontVariant: ['tabular-nums'],
  },
  rosterName: { color: '#FFF', fontSize: 13, fontWeight: '600', flex: 1 },
  rosterScoreNum: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 24,
    textAlign: 'right',
  },
  benchBar: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  benchBarText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },

  // Selected player bar
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    minHeight: 44,
  },
  selectedDot: { width: 8, height: 8, borderRadius: 4 },
  selectedJersey: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  selectedName: { color: '#FFF', fontSize: 15, fontWeight: '700', flex: 0 },
  selectedTeamHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, flex: 1 },
  selectedClose: { padding: 4 },
  selectedHint: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' },

  // Action area V2
  actionsAreaV2: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  pairedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pairedColumn: {
    flex: 1,
    gap: 6,
  },
  pairedColumnTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  scoreCell: {
    paddingVertical: 18,
    borderRadius: Radius.md,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCellText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  missCell: {
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missCellText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },

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
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  modalCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
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

  // Clock settings modal
  settingsLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingsBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  settingsBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  settingsBtnActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  settingsBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  settingsToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  settingsHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: Spacing.sm,
    lineHeight: 17,
  },
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
