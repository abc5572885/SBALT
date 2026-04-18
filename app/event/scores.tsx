import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEventById, getEventScores, getRegistrations, saveEventScores } from '@/services/database';
import {
  getEventPlayerSummaries,
  PlayerEventSummary,
  recordPlayerScore,
  removeLastPlayerScore,
} from '@/services/playerStats';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { Event, EventScore, Registration } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
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

export default function EventScoresScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [event, setEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<ScoreEntry[]>([
    { label: '主隊', score: 0 },
    { label: '客隊', score: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);

  // Player stats
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<(string | null)[]>([null, null]);
  const [playerSummaries, setPlayerSummaries] = useState<PlayerEventSummary[]>([]);
  const [pickerTeamIndex, setPickerTeamIndex] = useState<number | null>(null);

  const sportConfig = getSportConfig(event?.sport_type);
  const buttons = sportConfig.scoreButtons;
  // The primary action is the most common score (basketball: +2, others: +1)
  const primaryPoints = buttons.length >= 2 ? 2 : (buttons[0] || 1);
  const secondaryButtons = buttons.filter((b) => b !== primaryPoints);

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      const [eventData, existingScores, regs, summaries] = await Promise.all([
        getEventById(eventId),
        getEventScores(eventId),
        getRegistrations(eventId),
        getEventPlayerSummaries(eventId),
      ]);
      setEvent(eventData);
      if (existingScores.length > 0) {
        setEntries(
          existingScores.map((s: EventScore) => ({ label: s.label, score: s.score }))
        );
      }
      const active = regs.filter((r) => r.status === 'registered');
      setRegistrations(active);
      setPlayerSummaries(summaries);
      if (active.length > 0) {
        const p = await getProfilesByIds(active.map((r) => r.user_id));
        setProfiles(p);
      }
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const reloadSummaries = async () => {
    try {
      const s = await getEventPlayerSummaries(eventId);
      setPlayerSummaries(s);
    } catch {}
  };

  const addScore = async (index: number, points: number) => {
    Haptics.impactAsync(
      points >= 3
        ? Haptics.ImpactFeedbackStyle.Heavy
        : points >= 2
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, score: e.score + points } : e))
    );
    const playerId = selectedPlayers[index];
    if (playerId && event) {
      try {
        await recordPlayerScore({
          event_id: event.id,
          user_id: playerId,
          sport_type: event.sport_type || 'other',
          team_label: entries[index]?.label,
          points,
        });
        reloadSummaries();
      } catch (e) {
        // Silent fail on individual stat recording — UI score still updates
      }
    }
  };

  const decrementScore = async (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, score: Math.max(0, e.score - 1) } : e))
    );
    const playerId = selectedPlayers[index];
    if (playerId && event) {
      try {
        await removeLastPlayerScore(event.id, playerId);
        reloadSummaries();
      } catch {}
    }
  };

  const selectPlayer = (teamIndex: number, userId: string) => {
    setSelectedPlayers((prev) => {
      const next = [...prev];
      next[teamIndex] = userId;
      return next;
    });
    setPickerTeamIndex(null);
    Haptics.selectionAsync();
  };

  const clearPlayer = (teamIndex: number) => {
    setSelectedPlayers((prev) => {
      const next = [...prev];
      next[teamIndex] = null;
      return next;
    });
  };

  const playerSessionPoints = (userId: string): number => {
    return playerSummaries.find((s) => s.user_id === userId)?.points || 0;
  };

  const updateLabel = (index: number, label: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, label } : e))
    );
  };

  const resetScores = () => {
    Alert.alert('重置比分', '確定要把所有分數歸零嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setEntries((prev) => prev.map((e) => ({ ...e, score: 0 })));
        },
      },
    ]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveEventScores(
        eventId,
        entries.map((e) => ({ label: e.label.trim(), score: e.score }))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('比賽結束', '比分已記錄', [
        { text: '確定', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '儲存失敗');
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

  return (
    <SafeAreaView style={[styles.fullScreen, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
      {/* Top bar */}
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

      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        {entries.map((entry, index) => {
          const teamColor = TEAM_COLORS[index];

          return (
            <View key={index} style={[styles.teamHalf, { backgroundColor: teamColor }]}>
              {/* Team name - tap to edit */}
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

              {/* Selected player */}
              {(() => {
                const pid = selectedPlayers[index];
                if (pid) {
                  const name = getDisplayName(profiles[pid], pid, false);
                  return (
                    <TouchableOpacity
                      style={styles.playerRow}
                      onPress={() => setPickerTeamIndex(index)}
                      onLongPress={() => clearPlayer(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.playerPoints}>{playerSessionPoints(pid)} 分</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    style={styles.playerRowEmpty}
                    onPress={() => setPickerTeamIndex(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.playerRowEmptyText}>＋ 選球員</Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Score area - TAP = primary score action */}
              <TouchableOpacity
                style={styles.scoreArea}
                onPress={() => addScore(index, primaryPoints)}
                onLongPress={() => decrementScore(index)}
                delayLongPress={400}
                activeOpacity={0.85}
              >
                <Text style={styles.scoreNumber}>{entry.score}</Text>
                <Text style={styles.tapHint}>
                  點擊 +{primaryPoints}　長按 −1
                </Text>
              </TouchableOpacity>

              {/* Secondary buttons - only for sports with multiple point values */}
              {secondaryButtons.length > 0 && (
                <View style={styles.secondaryRow}>
                  {secondaryButtons.map((pts) => (
                    <TouchableOpacity
                      key={pts}
                      style={styles.secondaryBtn}
                      onPress={() => addScore(index, pts)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.secondaryBtnText}>+{pts}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Save */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>
            {saving ? '處理中...' : '結束比賽'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Player picker Modal */}
      <Modal
        visible={pickerTeamIndex !== null}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setPickerTeamIndex(null)}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerTeamIndex(null)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                選擇 {pickerTeamIndex !== null ? entries[pickerTeamIndex]?.label : ''} 球員
              </Text>
              <TouchableOpacity onPress={() => setPickerTeamIndex(null)} activeOpacity={0.6}>
                <Text style={styles.pickerClose}>關閉</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.pickerContent}>
              {registrations.length === 0 ? (
                <Text style={styles.pickerEmpty}>此活動尚無報名者，無法選擇球員</Text>
              ) : (
                registrations.map((r) => {
                  const name = getDisplayName(profiles[r.user_id], r.user_id, false);
                  const pts = playerSessionPoints(r.user_id);
                  const alreadySelectedOther = selectedPlayers.findIndex((p, i) => p === r.user_id && i !== pickerTeamIndex) >= 0;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.pickerItem, alreadySelectedOther && { opacity: 0.4 }]}
                      onPress={() => !alreadySelectedOther && pickerTeamIndex !== null && selectPlayer(pickerTeamIndex, r.user_id)}
                      disabled={alreadySelectedOther}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.pickerItemName}>{name}</Text>
                      <Text style={styles.pickerItemPoints}>
                        {alreadySelectedOther ? '另隊已選' : pts > 0 ? `${pts} 分` : '—'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
              {pickerTeamIndex !== null && selectedPlayers[pickerTeamIndex] && (
                <TouchableOpacity
                  style={[styles.pickerItem, styles.pickerClearItem]}
                  onPress={() => {
                    if (pickerTeamIndex !== null) {
                      clearPlayer(pickerTeamIndex);
                      setPickerTeamIndex(null);
                    }
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.pickerItemName, { color: '#F87171' }]}>取消選擇</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    alignItems: 'center',
    flex: 1,
  },
  topTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  topSport: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 1,
  },
  // Scoreboard
  scoreboard: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  teamHalf: {
    flex: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  teamNameArea: {
    width: '100%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  teamName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  teamNameInput: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    minWidth: 80,
  },
  // Score area — the main tap target
  scoreArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 88,
    fontWeight: '800',
    letterSpacing: -3,
  },
  tapHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: Spacing.sm,
  },
  // Secondary buttons (+1, +3 for basketball)
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.15)',
    width: '100%',
    justifyContent: 'center',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  // Bottom
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  saveButton: {
    backgroundColor: '#FFF',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  saveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  playerRow: {
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  playerRowEmpty: {
    width: '100%',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playerRowEmptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  playerName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  playerPoints: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#111',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pickerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pickerClose: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500' },
  pickerContent: { padding: Spacing.xl, gap: Spacing.xs },
  pickerEmpty: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', paddingVertical: Spacing.xxl },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pickerClearItem: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(248,113,113,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  pickerItemPoints: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
});
