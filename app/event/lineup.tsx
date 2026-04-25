import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLineup, LineupPlayer } from '@/services/basketballStats';
import { getEventById, getRegistrations } from '@/services/database';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { Event, Registration } from '@/types/database';
import { toast } from '@/store/useToast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface LineupRow {
  key: string;
  user_id?: string | null;
  display_name?: string | null;
  jersey_number?: string | null;
  team: 'A' | 'B' | null;  // null = unassigned
}

const TEAM_COLORS: Record<'A' | 'B', string> = {
  A: '#2563EB',
  B: '#DC2626',
};

export default function LineupScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [event, setEvent] = useState<Event | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [rows, setRows] = useState<LineupRow[]>([]);

  // 隊名（之後計分時可改）
  const [teamAName, setTeamAName] = useState('主隊');
  const [teamBName, setTeamBName] = useState('客隊');

  // 臨時球員表單
  const [tempName, setTempName] = useState('');
  const [tempNumber, setTempNumber] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const [e, regs] = await Promise.all([
          getEventById(eventId),
          getRegistrations(eventId),
        ]);
        setEvent(e);
        const active = (regs || []).filter((r: Registration) => r.status === 'registered');
        if (active.length > 0) {
          const userIds = active.map((r: Registration) => r.user_id);
          const ps = await getProfilesByIds(userIds);
          setProfiles(ps);
          // 預載報名者為未分隊
          setRows(active.map((r: Registration) => ({
            key: `reg-${r.id}`,
            user_id: r.user_id,
            display_name: null,
            jersey_number: null,
            team: null as 'A' | 'B' | null,
          })));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const setRowTeam = (key: string, team: 'A' | 'B' | null) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, team } : r)));
  };

  const setRowJersey = (key: string, jersey: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, jersey_number: jersey } : r)));
  };

  const addTempPlayer = (team: 'A' | 'B') => {
    if (!tempName.trim()) {
      toast.error('請輸入臨時球員姓名');
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        key: `temp-${Date.now()}`,
        user_id: null,
        display_name: tempName.trim(),
        jersey_number: tempNumber.trim() || null,
        team,
      },
    ]);
    setTempName('');
    setTempNumber('');
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleSave = async () => {
    if (!eventId) return;
    const teamA = rows.filter((r) => r.team === 'A');
    const teamB = rows.filter((r) => r.team === 'B');

    if (teamA.length === 0 && teamB.length === 0) {
      toast.error('請先分配球員到隊伍');
      return;
    }

    try {
      setSaving(true);
      const players: LineupPlayer[] = rows
        .filter((r) => r.team !== null)
        .map((r) => ({
          user_id: r.user_id ?? null,
          display_name: r.display_name ?? null,
          jersey_number: r.jersey_number ?? null,
          team_label: r.team === 'A' ? teamAName : teamBName,
        }));
      await createLineup(eventId, players);
      toast.success('陣容已建立');
      router.replace({ pathname: '/event/scores', params: { eventId } });
    } catch (error: any) {
      toast.error(error.message || '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="設定陣容" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  const unassigned = rows.filter((r) => r.team === null);
  const teamARows = rows.filter((r) => r.team === 'A');
  const teamBRows = rows.filter((r) => r.team === 'B');

  return (
    <ScreenLayout scrollable>
      <PageHeader title="設定陣容" />

      {event && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {event.title} · {event.sport_type === 'basketball' ? '籃球' : event.sport_type}
        </Text>
      )}

      {/* 隊名 */}
      <View style={styles.teamNameRow}>
        <View style={styles.teamNameField}>
          <View style={[styles.teamColorDot, { backgroundColor: TEAM_COLORS.A }]} />
          <TextInput
            style={[styles.teamNameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={teamAName}
            onChangeText={setTeamAName}
            placeholder="A 隊名"
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <View style={styles.teamNameField}>
          <View style={[styles.teamColorDot, { backgroundColor: TEAM_COLORS.B }]} />
          <TextInput
            style={[styles.teamNameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={teamBName}
            onChangeText={setTeamBName}
            placeholder="B 隊名"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      </View>

      {/* 報名球員（未分隊） */}
      {unassigned.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            報名者（未分隊 {unassigned.length}）
          </ThemedText>
          {unassigned.map((r) => {
            const name = r.user_id
              ? getDisplayName(profiles[r.user_id], r.user_id, false)
              : r.display_name || '';
            return (
              <View key={r.key} style={[styles.playerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, { color: colors.text }]}>{name}</Text>
                </View>
                <TextInput
                  style={[styles.jerseyInput, { color: colors.text, borderColor: colors.border }]}
                  value={r.jersey_number || ''}
                  onChangeText={(v) => setRowJersey(r.key, v)}
                  placeholder="#"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TouchableOpacity
                  style={[styles.teamBtn, { borderColor: TEAM_COLORS.A }]}
                  onPress={() => setRowTeam(r.key, 'A')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.teamBtnText, { color: TEAM_COLORS.A }]}>A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.teamBtn, { borderColor: TEAM_COLORS.B }]}
                  onPress={() => setRowTeam(r.key, 'B')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.teamBtnText, { color: TEAM_COLORS.B }]}>B</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* A 隊 */}
      <TeamSection
        team="A"
        teamName={teamAName}
        rows={teamARows}
        profiles={profiles}
        colors={colors}
        onRemove={(key) => removeRow(key)}
        onUnassign={(key) => setRowTeam(key, null)}
        onJerseyChange={setRowJersey}
      />

      {/* B 隊 */}
      <TeamSection
        team="B"
        teamName={teamBName}
        rows={teamBRows}
        profiles={profiles}
        colors={colors}
        onRemove={(key) => removeRow(key)}
        onUnassign={(key) => setRowTeam(key, null)}
        onJerseyChange={setRowJersey}
      />

      {/* 加入臨時球員 */}
      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          加入臨時球員（非報名者）
        </ThemedText>
        <View style={styles.tempForm}>
          <TextInput
            style={[styles.tempInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
            value={tempName}
            onChangeText={setTempName}
            placeholder="姓名"
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={[styles.tempInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, width: 70 }]}
            value={tempNumber}
            onChangeText={setTempNumber}
            placeholder="#"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
        <View style={styles.tempActions}>
          <TouchableOpacity
            style={[styles.tempAddBtn, { backgroundColor: TEAM_COLORS.A + '20', borderColor: TEAM_COLORS.A }]}
            onPress={() => addTempPlayer('A')}
            activeOpacity={0.7}
          >
            <Text style={{ color: TEAM_COLORS.A, fontWeight: '600' }}>＋ 加入 {teamAName}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tempAddBtn, { backgroundColor: TEAM_COLORS.B + '20', borderColor: TEAM_COLORS.B }]}
            onPress={() => addTempPlayer('B')}
            activeOpacity={0.7}
          >
            <Text style={{ color: TEAM_COLORS.B, fontWeight: '600' }}>＋ 加入 {teamBName}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.saveText}>{saving ? '建立中...' : '開始記錄'}</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

function TeamSection({
  team, teamName, rows, profiles, colors, onRemove, onUnassign, onJerseyChange,
}: {
  team: 'A' | 'B';
  teamName: string;
  rows: LineupRow[];
  profiles: Record<string, Profile>;
  colors: any;
  onRemove: (key: string) => void;
  onUnassign: (key: string) => void;
  onJerseyChange: (key: string, jersey: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.teamHeaderRow}>
        <View style={[styles.teamColorDot, { backgroundColor: TEAM_COLORS[team] }]} />
        <Text style={[styles.teamHeader, { color: colors.text }]}>
          {teamName}（{rows.length} 人）
        </Text>
      </View>
      {rows.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: colors.border }]}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>尚無球員</ThemedText>
        </View>
      ) : (
        rows.map((r) => {
          const name = r.user_id
            ? getDisplayName(profiles[r.user_id], r.user_id, false)
            : r.display_name || '';
          const isTemp = !r.user_id;
          return (
            <View
              key={r.key}
              style={[styles.playerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.playerName, { color: colors.text }]}>{name}</Text>
                {isTemp && (
                  <View style={[styles.tempBadge, { backgroundColor: colors.disabled + '40' }]}>
                    <ThemedText type="label" style={{ color: colors.textSecondary }}>臨時</ThemedText>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.jerseyInput, { color: colors.text, borderColor: colors.border }]}
                value={r.jersey_number || ''}
                onChangeText={(v) => onJerseyChange(r.key, v)}
                placeholder="#"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={3}
              />
              {isTemp ? (
                <TouchableOpacity
                  onPress={() => onRemove(r.key)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <IconSymbol name="trash" size={16} color={colors.error} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.unassignBtn, { borderColor: colors.border }]}
                  onPress={() => onUnassign(r.key)}
                  activeOpacity={0.6}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>移出</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  subtitle: { fontSize: 13, marginBottom: Spacing.lg },
  teamNameRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  teamNameField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamColorDot: { width: 10, height: 10, borderRadius: 5 },
  teamNameInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    fontWeight: '600',
  },
  section: { marginBottom: Spacing.xl, gap: Spacing.sm },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1 },
  teamHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamHeader: { fontSize: 16, fontWeight: '700' },
  emptyCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  playerName: { fontSize: 15, fontWeight: '500' },
  tempBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jerseyInput: {
    width: 50,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    fontSize: 14,
  },
  teamBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBtnText: { fontSize: 14, fontWeight: '700' },
  unassignBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tempForm: { flexDirection: 'row', gap: Spacing.sm },
  tempInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  tempActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  tempAddBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
