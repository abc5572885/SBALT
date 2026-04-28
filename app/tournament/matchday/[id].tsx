/**
 * Tournament Matchday Detail — 比賽日詳情頁。
 *
 * Shows matches scheduled for this matchday. Organizer can add a new match by
 * picking 2 registered teams + (optional) division. Tap a match → scoring (if
 * open) or box score (if finished).
 */

import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupById } from '@/services/groups';
import {
  createTournamentMatch,
  deleteMatch,
  getMatchdayMatches,
  Match,
} from '@/services/matches';
import {
  basketballTotalPoints,
  getMatchBadmintonStats,
  getMatchBasketballStats,
  getMatchVolleyballStats,
} from '@/services/sportStats';
import {
  getMatchdayById,
  TournamentMatchday,
} from '@/services/tournamentMatchdays';
import {
  getDivisions,
  TournamentDivision,
} from '@/services/tournamentDivisions';
import {
  getRegistrations,
  TournamentRegistration,
} from '@/services/tournamentRegistrations';
import { getTournamentById, Tournament } from '@/services/tournaments';
import { Group } from '@/types/database';
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
  TouchableOpacity,
  View,
} from 'react-native';

const TEAM_COLORS = ['#2563EB', '#DC2626'];

export default function MatchdayScreen() {
  const { id, tournamentId } = useLocalSearchParams<{ id: string; tournamentId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [matchday, setMatchday] = useState<TournamentMatchday | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scoresByMatch, setScoresByMatch] = useState<Record<string, { home: number; away: number }>>({});
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [registrationGroups, setRegistrationGroups] = useState<Record<string, Group>>({});
  const [divisions, setDivisions] = useState<TournamentDivision[]>([]);
  const [organizerGroupCreatorId, setOrganizerGroupCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const md = await getMatchdayById(id);
      if (!md) {
        setLoading(false);
        return;
      }
      setMatchday(md);
      const tid = md.tournament_id;
      const [t, ms, regs, divs] = await Promise.all([
        getTournamentById(tid),
        getMatchdayMatches(id),
        getRegistrations(tid),
        getDivisions(tid),
      ]);
      setTournament(t);
      setMatches(ms);
      setDivisions(divs);
      const active = regs.filter((r) => r.status !== 'withdrawn');
      setRegistrations(active);

      if (t?.organizer_group_id) {
        const og = await getGroupById(t.organizer_group_id).catch(() => null);
        setOrganizerGroupCreatorId(og?.creator_id || null);
      }

      const groupIds = [...new Set(active.map((r) => r.group_id))];
      if (groupIds.length > 0) {
        const groups = await Promise.all(groupIds.map((gid) => getGroupById(gid).catch(() => null)));
        const map: Record<string, Group> = {};
        groups.forEach((g) => {
          if (g) map[g.id] = g;
        });
        setRegistrationGroups(map);
      }

      // Compute live scores
      if (t?.sport_type && ms.length > 0) {
        const entries = await Promise.all(
          ms.map(async (m) => {
            let home = 0;
            let away = 0;
            if (t.sport_type === 'basketball') {
              const stats = await getMatchBasketballStats(m.id);
              for (const s of stats) {
                const pts = basketballTotalPoints(s);
                if (s.team_label === m.home_label) home += pts;
                else if (s.team_label === m.away_label) away += pts;
              }
            } else if (t.sport_type === 'volleyball') {
              const stats = await getMatchVolleyballStats(m.id);
              for (const s of stats) {
                const pts = s.points_total || 0;
                if (s.team_label === m.home_label) home += pts;
                else if (s.team_label === m.away_label) away += pts;
              }
            } else if (t.sport_type === 'badminton') {
              const stats = await getMatchBadmintonStats(m.id);
              for (const s of stats) {
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
      console.error('[matchday] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const isOrganizer = user?.id && organizerGroupCreatorId === user.id;

  const openMatch = (m: Match) => {
    router.push({
      pathname: m.status === 'finished' ? '/event/box-score' : '/event/scores',
      params: { eventId: tournamentId || '', matchId: m.id },
    });
  };

  const confirmDelete = (m: Match) => {
    Alert.alert(
      `刪除 ${m.home_label} vs ${m.away_label}`,
      '所有計分資料會被清除，無法復原。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            await deleteMatch(m.id);
            loadData();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="比賽日" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!matchday) {
    return (
      <ScreenLayout>
        <PageHeader title="比賽日" />
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>找不到比賽日</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable>
      <PageHeader title={`第 ${matchday.matchday_number} 比賽日`} />

      <View style={styles.metaCard}>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {matchday.scheduled_date || '日期待定'}
          {matchday.location ? ` · ${matchday.location}` : ''}
        </Text>
        {tournament && (
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {tournament.title}
          </Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          場次{matches.length > 0 ? ` · ${matches.length}` : ''}
        </Text>
        {isOrganizer && registrations.length >= 2 && (
          <TouchableOpacity onPress={() => setCreateOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>+ 新增場次</Text>
          </TouchableOpacity>
        )}
      </View>

      {matches.length === 0 ? (
        <View style={[styles.emptyHint, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
            {registrations.length < 2
              ? '至少要 2 隊報名才能排場次'
              : isOrganizer
                ? '尚未排場次，點上方建立第一場'
                : '主辦尚未公佈場次'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: Spacing.sm }}>
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
                <Pressable onPress={() => openMatch(m)} style={styles.matchInner}>
                  <View style={styles.matchHeader}>
                    <View style={[styles.matchPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.matchPillText, { color: colors.textSecondary }]}>
                        場 {m.match_number}
                      </Text>
                    </View>
                    {m.division_id && (() => {
                      const d = divisions.find((x) => x.id === m.division_id);
                      if (!d) return null;
                      return (
                        <View style={[styles.matchPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <Text style={[styles.matchPillText, { color: colors.textSecondary }]}>{d.name}</Text>
                        </View>
                      );
                    })()}
                    <View
                      style={[
                        styles.matchPill,
                        m.status === 'finished'
                          ? { backgroundColor: colors.statusSuccess + '22' }
                          : { backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.matchPillText,
                          {
                            color: m.status === 'finished' ? colors.statusSuccess : colors.primary,
                          },
                        ]}
                      >
                        {m.status === 'finished' ? '已結束' : '進行中'}
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
                          styles.matchScore,
                          { color: colors.text, fontWeight: winner === 'home' ? '900' : '700' },
                        ]}
                      >
                        {score.home}
                      </Text>
                    </View>
                    <Text style={[styles.matchSep, { color: colors.textSecondary }]}>—</Text>
                    <View style={styles.matchTeamCol}>
                      <Text style={[styles.matchTeamLabel, { color: TEAM_COLORS[1] }]} numberOfLines={1}>
                        {m.away_label}
                      </Text>
                      <Text
                        style={[
                          styles.matchScore,
                          { color: colors.text, fontWeight: winner === 'away' ? '900' : '700' },
                        ]}
                      >
                        {score.away}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                {isOrganizer && (
                  <TouchableOpacity
                    style={styles.matchDeleteBtn}
                    onPress={() => confirmDelete(m)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <IconSymbol name="trash" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />

      {/* New match modal */}
      <CreateMatchModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        matchdayId={matchday.id}
        sport={tournament?.sport_type || 'other'}
        registrations={registrations}
        registrationGroups={registrationGroups}
        divisions={divisions}
        onCreated={loadData}
        colors={colors}
      />
    </ScreenLayout>
  );
}

function CreateMatchModal({
  visible, onClose, matchdayId, sport, registrations, registrationGroups, divisions, onCreated, colors,
}: {
  visible: boolean;
  onClose: () => void;
  matchdayId: string;
  sport: string;
  registrations: TournamentRegistration[];
  registrationGroups: Record<string, Group>;
  divisions: TournamentDivision[];
  onCreated: () => void;
  colors: any;
}) {
  const [pickedDivision, setPickedDivision] = useState<TournamentDivision | null>(null);
  const [home, setHome] = useState<TournamentRegistration | null>(null);
  const [away, setAway] = useState<TournamentRegistration | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setPickedDivision(null);
      setHome(null);
      setAway(null);
    }
  }, [visible]);

  const eligible = pickedDivision
    ? registrations.filter((r) => r.division_id === pickedDivision.id)
    : registrations;

  const handleCreate = async () => {
    if (!home || !away || home.id === away.id) {
      toast.error('請選兩支不同隊伍');
      return;
    }
    try {
      setSaving(true);
      await createTournamentMatch({
        matchdayId,
        divisionId: pickedDivision?.id,
        homeGroupId: home.group_id,
        awayGroupId: away.group_id,
        homeLabel: home.team_label,
        awayLabel: away.team_label,
        sport,
      });
      onClose();
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>新增場次</Text>

          {divisions.length > 0 && (
            <>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                分組（選填，會 filter 隊伍）
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.pickerChip,
                    {
                      borderColor: !pickedDivision ? colors.text : colors.border,
                      backgroundColor: !pickedDivision ? colors.text : colors.background,
                    },
                  ]}
                  onPress={() => setPickedDivision(null)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: !pickedDivision ? colors.background : colors.text, fontSize: 13, fontWeight: '600' }}>
                    全部
                  </Text>
                </TouchableOpacity>
                {divisions.map((d) => {
                  const picked = pickedDivision?.id === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.pickerChip,
                        {
                          borderColor: picked ? colors.text : colors.border,
                          backgroundColor: picked ? colors.text : colors.background,
                        },
                      ]}
                      onPress={() => setPickedDivision(d)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: picked ? colors.background : colors.text, fontSize: 13, fontWeight: '600' }}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            主隊
          </Text>
          <TeamPicker registrations={eligible} pickedId={home?.id} excludeId={away?.id} onPick={setHome} colors={colors} />

          <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            客隊
          </Text>
          <TeamPicker registrations={eligible} pickedId={away?.id} excludeId={home?.id} onPick={setAway} colors={colors} />

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalConfirm,
                { backgroundColor: colors.text },
                (!home || !away || saving) && { opacity: 0.4 },
              ]}
              onPress={handleCreate}
              disabled={!home || !away || saving}
            >
              <Text style={{ color: colors.background, fontSize: 14, fontWeight: '700' }}>
                {saving ? '建立中...' : '建立'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TeamPicker({
  registrations, pickedId, excludeId, onPick, colors,
}: {
  registrations: TournamentRegistration[];
  pickedId?: string;
  excludeId?: string;
  onPick: (r: TournamentRegistration) => void;
  colors: any;
}) {
  const eligible = registrations.filter((r) => r.id !== excludeId);
  if (eligible.length === 0) {
    return (
      <Text style={{ color: colors.textSecondary, fontSize: 13, paddingVertical: Spacing.sm }}>
        無可選隊伍
      </Text>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {eligible.map((r) => {
        const picked = r.id === pickedId;
        return (
          <TouchableOpacity
            key={r.id}
            style={[
              styles.pickerChip,
              {
                borderColor: picked ? colors.text : colors.border,
                backgroundColor: picked ? colors.text : colors.background,
              },
            ]}
            onPress={() => onPick(r)}
            activeOpacity={0.7}
          >
            <Text style={{ color: picked ? colors.background : colors.text, fontSize: 13, fontWeight: '600' }}>
              {r.team_label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  metaCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    gap: 4,
  },
  metaText: { fontSize: 13 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionAction: { fontSize: 13, fontWeight: '700' },
  emptyHint: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },

  matchCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  matchInner: { flex: 1, padding: Spacing.lg },
  matchHeader: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  matchPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  matchPillText: { fontSize: 10, fontWeight: '700' },
  matchScoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  matchTeamCol: { flex: 1, alignItems: 'center', gap: 2 },
  matchTeamLabel: { fontSize: 12, fontWeight: '700' },
  matchScore: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  matchSep: { fontSize: 18, fontWeight: '300' },
  matchDeleteBtn: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(0,0,0,0.06)',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.sm, maxHeight: '80%' },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: Spacing.sm },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  modalCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  modalConfirm: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  pickerChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
