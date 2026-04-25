import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  BasketballAction,
  BASKETBALL_ACTIONS,
  getActionMeta,
  recordAction as recordBasketballAction,
  undoAction as undoBasketballAction,
} from '@/services/basketballStats';
import { getEventById, getEventScores, saveEventScores } from '@/services/database';
import { BasketballStat, getEventBasketballStats } from '@/services/sportStats';
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

interface ActionLog {
  id: string;
  stat_id: string;
  action: BasketballAction;
  ts: number;
}

export default function EventScoresScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Basketball Pro mode state
  const [stats, setStats] = useState<BasketballStat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selectedStatId, setSelectedStatId] = useState<string | null>(null);
  const [log, setLog] = useState<ActionLog[]>([]);
  const [showSecondary, setShowSecondary] = useState(false);

  // Simple mode state (non-basketball)
  const [entries, setEntries] = useState<ScoreEntry[]>([
    { label: '主隊', score: 0 },
    { label: '客隊', score: 0 },
  ]);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const sportConfig = getSportConfig(event?.sport_type);
  const isBasketball = event?.sport_type === 'basketball';
  const buttons = sportConfig.scoreButtons;
  const primaryPoints = buttons.length >= 2 ? 2 : (buttons[0] || 1);
  const secondaryButtons = buttons.filter((b) => b !== primaryPoints);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventData, existingScores, bballStats] = await Promise.all([
        getEventById(eventId),
        getEventScores(eventId),
        getEventBasketballStats(eventId),
      ]);
      setEvent(eventData);
      setStats(bballStats);

      if (existingScores.length > 0) {
        setEntries(existingScores.map((s: EventScore) => ({ label: s.label, score: s.score })));
      }

      // Load profiles for non-temp players
      const userIds = bballStats.map((s) => s.user_id).filter(Boolean) as string[];
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

  // 籃球 Pro 模式：若沒陣容，跳到 lineup 頁
  useEffect(() => {
    if (!loading && isBasketball && stats.length === 0) {
      router.replace({ pathname: '/event/lineup', params: { eventId } });
    }
  }, [loading, isBasketball, stats.length, eventId, router]);

  // 從 stats 推算隊伍總分
  const teamScores = useMemo(() => {
    if (!isBasketball) return null;
    const map = new Map<string, number>();
    for (const s of stats) {
      const total = s.points_1pt * 1 + s.points_2pt * 2 + s.points_3pt * 3;
      map.set(s.team_label, (map.get(s.team_label) || 0) + total);
    }
    return Array.from(map.entries()).map(([label, score]) => ({ label, score }));
  }, [stats, isBasketball]);

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

  const handleAction = async (action: BasketballAction) => {
    if (!selectedStatId) {
      toast.error('請先選球員');
      return;
    }
    const stat = stats.find((s) => s.id === selectedStatId);
    if (!stat) return;
    const meta = getActionMeta(action);
    Haptics.impactAsync(
      meta.pointsDelta >= 3 ? Haptics.ImpactFeedbackStyle.Heavy
        : meta.pointsDelta >= 2 ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );

    // Optimistic UI update
    setStats((prev) => prev.map((s) =>
      s.id === selectedStatId ? { ...s, [meta.field]: (s[meta.field] as number) + 1 } : s
    ));
    setLog((prev) => [
      { id: `${selectedStatId}-${Date.now()}`, stat_id: selectedStatId, action, ts: Date.now() },
      ...prev,
    ].slice(0, 20));

    try {
      const updated = await recordBasketballAction(stat, action);
      setStats((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e: any) {
      toast.error(e.message || '記錄失敗');
      // Rollback
      setStats((prev) => prev.map((s) =>
        s.id === selectedStatId ? { ...s, [meta.field]: Math.max(0, (s[meta.field] as number) - 1) } : s
      ));
    }
  };

  const handleUndo = async (entry: ActionLog) => {
    const stat = stats.find((s) => s.id === entry.stat_id);
    if (!stat) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    const meta = getActionMeta(entry.action);

    setStats((prev) => prev.map((s) =>
      s.id === entry.stat_id ? { ...s, [meta.field]: Math.max(0, (s[meta.field] as number) - 1) } : s
    ));
    setLog((prev) => prev.filter((l) => l.id !== entry.id));

    try {
      const updated = await undoBasketballAction(stat, entry.action);
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
          if (isBasketball) {
            // Pro mode 重置：保留陣容，只把所有 stats 歸零（DB + 本地）
            // 暫時不實作，避免誤觸；建議刪除陣容重建
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
      const finalEntries = isBasketball && teamScores
        ? teamScores.map((t) => ({ label: t.label, score: t.score }))
        : entries.map((e) => ({ label: e.label.trim(), score: e.score }));
      await saveEventScores(eventId, finalEntries);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('比分已記錄');
      router.back();
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
  // Render: Basketball Pro mode
  // ============================================================
  if (isBasketball && stats.length > 0) {
    const primaryActions = BASKETBALL_ACTIONS.filter((a) => a.category === 'primary');
    const secondaryActions = BASKETBALL_ACTIONS.filter((a) => a.category === 'secondary');

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
                    const total = s.points_1pt * 1 + s.points_2pt * 2 + s.points_3pt * 3;
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
          <View style={styles.actionGrid}>
            {primaryActions.map((a) => (
              <TouchableOpacity
                key={a.key}
                style={[
                  styles.actionBtn,
                  !selectedStatId && { opacity: 0.4 },
                ]}
                onPress={() => handleAction(a.key)}
                disabled={!selectedStatId}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {showSecondary && (
            <View style={styles.actionGrid}>
              {secondaryActions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[
                    styles.actionBtn,
                    styles.actionBtnSecondary,
                    !selectedStatId && { opacity: 0.4 },
                  ]}
                  onPress={() => handleAction(a.key)}
                  disabled={!selectedStatId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnText}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.toggleSecondary}
            onPress={() => setShowSecondary((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {showSecondary ? '收起' : '更多動作'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent log */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>最近紀錄（點擊取消）</Text>
          {log.length === 0 ? (
            <Text style={styles.logEmpty}>尚無紀錄</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.logRow}>
              {log.map((entry) => {
                const stat = stats.find((s) => s.id === entry.stat_id);
                if (!stat) return null;
                const name = stat.user_id
                  ? getDisplayName(profiles[stat.user_id], stat.user_id, false)
                  : stat.display_name || '';
                const meta = getActionMeta(entry.action);
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.logChip}
                    onPress={() => handleUndo(entry)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.logChipText} numberOfLines={1}>
                      {name} · {meta.label}
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
  actionsArea: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  actionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, justifyContent: 'space-between',
  },
  actionBtn: {
    flexBasis: '32%',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  toggleSecondary: { paddingVertical: Spacing.sm, alignItems: 'center' },

  // Log
  logSection: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 4 },
  logTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  logEmpty: { color: 'rgba(255,255,255,0.3)', fontSize: 12, paddingVertical: Spacing.xs },
  logRow: { gap: Spacing.xs, paddingVertical: 4 },
  logChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  logChipText: { color: '#FFF', fontSize: 12, fontWeight: '500' },

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
