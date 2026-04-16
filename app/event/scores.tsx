import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEventById, getEventScores, saveEventScores } from '@/services/database';
import { Event, EventScore } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
      const [eventData, existingScores] = await Promise.all([
        getEventById(eventId),
        getEventScores(eventId),
      ]);
      setEvent(eventData);
      if (existingScores.length > 0) {
        setEntries(
          existingScores.map((s: EventScore) => ({ label: s.label, score: s.score }))
        );
      }
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const addScore = (index: number, points: number) => {
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
  };

  const decrementScore = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, score: Math.max(0, e.score - 1) } : e))
    );
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
});
