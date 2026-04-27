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
  tone: 'score' | 'positive' | 'negative';
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

    try {
      const updated = await dispatchRecordAction(sportKey, stat, action);
      setStats((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e: any) {
      toast.error(e.message || '記錄失敗');
      setLog((prev) => prev.filter((l) => l.stat_id !== selectedStatId || l.ts !== prev[0].ts));
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
              const team = teamScores?.find((t) => t.label === label);
              return (
                <View key={label} style={styles.proScoreItem}>
                  <Text style={[styles.proTeamLabel, { color: TEAM_COLORS[i] }]}>{label}</Text>
                  <Text style={styles.proScoreNum}>{team?.score || 0}</Text>
                </View>
              );
            })}
          </View>
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

        {/* Player rosters per team */}
        <ScrollView style={{ flexGrow: 0 }}>
          {teamLabels.map((label, i) => {
            const teamStats = stats.filter((s) => s.team_label === label);
            return (
              <View key={label} style={styles.rosterSection}>
                <View style={[styles.rosterDot, { backgroundColor: TEAM_COLORS[i] }]} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rosterRow}
                >
                  {teamStats.map((s) => {
                    const name = s.user_id
                      ? getDisplayName(profiles[s.user_id], s.user_id, false)
                      : s.display_name || '';
                    const total = getPlayerTotalPoints(s, sportKey);
                    const selected = selectedStatId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.playerChip,
                          { borderColor: TEAM_COLORS[i] },
                          selected && { backgroundColor: TEAM_COLORS[i] },
                        ]}
                        onPress={() => handlePlayerSelect(s.id)}
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
                          {total}
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

  // Roster
  rosterSection: { paddingVertical: Spacing.sm },
  rosterDot: {
    height: 4, marginHorizontal: Spacing.lg, marginBottom: Spacing.xs, borderRadius: 2,
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
