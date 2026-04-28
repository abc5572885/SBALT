/**
 * Tournament Detail — 賽事詳情頁。
 *
 * 三個區塊（依 organizer / team admin / viewer 顯示不同 CTA）：
 *   - 賽事資訊
 *   - 分組（divisions） — organizer 可建/改
 *   - 比賽日（matchdays） — organizer 可建/改，每個 matchday 點進去看 matches
 *   - 報名隊伍（registrations） — 群組 admin 可幫自己群組報名
 */

import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getFormatLabel, getStatusLabel } from '@/constants/tournaments';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyGroups, getGroupById } from '@/services/groups';
import { toast } from '@/store/useToast';
import {
  getTournamentById,
  Tournament,
} from '@/services/tournaments';
import {
  createDivision,
  deleteDivision,
  getDivisions,
  TournamentDivision,
} from '@/services/tournamentDivisions';
import {
  createMatchday,
  deleteMatchday,
  getMatchdays,
  TournamentMatchday,
} from '@/services/tournamentMatchdays';
import {
  getRegistrations,
  registerGroup,
  TournamentRegistration,
  updateRegistration,
  withdrawRegistration,
} from '@/services/tournamentRegistrations';
import {
  getTournamentStandings,
  TeamStanding,
} from '@/services/tournamentStandings';
import { Group } from '@/types/database';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [organizerGroup, setOrganizerGroup] = useState<Group | null>(null);
  const [divisions, setDivisions] = useState<TournamentDivision[]>([]);
  const [matchdays, setMatchdays] = useState<TournamentMatchday[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [registrationGroups, setRegistrationGroups] = useState<Record<string, Group>>({});
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [createDivOpen, setCreateDivOpen] = useState(false);
  const [createMdOpen, setCreateMdOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const t = await getTournamentById(id);
      if (!t) {
        setLoading(false);
        return;
      }
      setTournament(t);
      const [og, divs, mds, regs] = await Promise.all([
        getGroupById(t.organizer_group_id),
        getDivisions(t.id),
        getMatchdays(t.id),
        getRegistrations(t.id),
      ]);
      setOrganizerGroup(og);
      setDivisions(divs);
      setMatchdays(mds);
      const active = regs.filter((r) => r.status !== 'withdrawn');
      setRegistrations(active);

      // Load groups behind registrations
      if (active.length > 0) {
        const groupIds = [...new Set(active.map((r) => r.group_id))];
        const groupResults = await Promise.all(groupIds.map((gid) => getGroupById(gid).catch(() => null)));
        const map: Record<string, Group> = {};
        groupResults.forEach((g) => {
          if (g) map[g.id] = g;
        });
        setRegistrationGroups(map);
      }

      // My groups (for "register team" picker)
      if (user?.id) {
        const mine = await getMyGroups(user.id);
        setMyGroups(mine.filter((g) => g.creator_id === user.id));
      }

      // Standings (computed across all finished tournament matches)
      setStandings(await getTournamentStandings(t.id));
    } catch (e) {
      console.error('[tournament] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const isOrganizer = organizerGroup?.creator_id === user?.id;
  const myRegistrations = registrations.filter((r) =>
    myGroups.some((g) => g.id === r.group_id),
  );

  const registrationClosed = tournament?.registration_deadline
    ? new Date(tournament.registration_deadline) < new Date()
    : false;

  const handleShare = async () => {
    if (!tournament) return;
    await Share.share({
      message: `${tournament.title}\n\n${tournament.description || ''}\n地點：${tournament.location}\n${tournament.start_date}`,
    });
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="賽事詳情" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!tournament) {
    return (
      <ScreenLayout>
        <PageHeader title="賽事詳情" />
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>找不到賽事</ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  const sportLabel = SPORT_OPTIONS.find((s) => s.key === tournament.sport_type)?.label || '';

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="賽事詳情"
        rightContent={
          <TouchableOpacity onPress={handleShare} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <IconSymbol name="square.and.arrow.up" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Header */}
      <View style={styles.section}>
        <Text style={[styles.title, { color: colors.text }]}>{tournament.title}</Text>
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagText, { color: colors.text }]}>{sportLabel}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagText, { color: colors.text }]}>{getFormatLabel(tournament.format)}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>
              {getStatusLabel(tournament.status)}
            </Text>
          </View>
        </View>
        {tournament.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {tournament.description}
          </Text>
        )}
      </View>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <InfoRow label="期間" value={`${tournament.start_date}${tournament.end_date ? ` ~ ${tournament.end_date}` : ''}`} colors={colors} />
        {tournament.registration_deadline && (
          <InfoRow label="報名截止" value={tournament.registration_deadline} colors={colors} />
        )}
        <InfoRow label="地點" value={tournament.location} colors={colors} />
        {tournament.entry_fee > 0 && (
          <InfoRow label="報名費" value={`NT$ ${tournament.entry_fee}`} colors={colors} />
        )}
        {tournament.prize_pool && (
          <InfoRow label="獎品" value={tournament.prize_pool} colors={colors} />
        )}
        {organizerGroup && (
          <InfoRow label="主辦" value={organizerGroup.name} colors={colors} />
        )}
      </View>

      {/* Register CTA (group admin) */}
      {!isOrganizer && myGroups.length > 0 && !registrationClosed && (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.text },
            Shadows.sm,
            myRegistrations.length > 0 && { opacity: 0.4 },
          ]}
          onPress={() => setRegisterOpen(true)}
          disabled={myRegistrations.length > 0}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>
            {myRegistrations.length > 0 ? '已報名' : '報名我的隊伍'}
          </Text>
        </TouchableOpacity>
      )}
      {registrationClosed && (
        <View style={[styles.statusBanner, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>報名已截止</Text>
        </View>
      )}

      {/* Divisions */}
      <SectionHeader
        title="分組"
        count={divisions.length}
        onAction={isOrganizer ? () => setCreateDivOpen(true) : undefined}
        actionLabel="+ 新增分組"
        colors={colors}
      />
      {divisions.length === 0 ? (
        <EmptyHint text={isOrganizer ? '尚未設定分組，點上方建立第一組' : '主辦尚未設定分組'} colors={colors} />
      ) : (
        <View style={styles.cardList}>
          {divisions.map((d) => {
            const teamsInDivision = registrations.filter((r) => r.division_id === d.id);
            return (
              <View
                key={d.id}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{d.name}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                    {teamsInDivision.length} 隊
                  </Text>
                </View>
                {isOrganizer && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('刪除分組', `確定要刪除「${d.name}」？`, [
                        { text: '取消', style: 'cancel' },
                        {
                          text: '刪除',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteDivision(d.id);
                            loadData();
                          },
                        },
                      ]);
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <IconSymbol name="trash" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Matchdays */}
      <SectionHeader
        title="比賽日"
        count={matchdays.length}
        onAction={isOrganizer ? () => setCreateMdOpen(true) : undefined}
        actionLabel="+ 新增比賽日"
        colors={colors}
      />
      {matchdays.length === 0 ? (
        <EmptyHint text={isOrganizer ? '尚未排比賽日，點上方新增第一日' : '尚未公佈比賽日'} colors={colors} />
      ) : (
        <View style={styles.cardList}>
          {matchdays.map((md) => (
            <TouchableOpacity
              key={md.id}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/tournament/matchday/[id]',
                  params: { id: md.id, tournamentId: tournament.id },
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  第 {md.matchday_number} 比賽日
                </Text>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {md.scheduled_date || '日期待定'}
                  {md.location ? ` · ${md.location}` : ''}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Standings (only show if any matches finished) */}
      {standings.some((s) => s.played > 0) && (
        <>
          <SectionHeader title="排名" count={0} colors={colors} />
          {divisions.length > 0 ? (
            divisions.map((d) => {
              const inDiv = standings.filter((s) => s.division_id === d.id && s.played > 0);
              if (inDiv.length === 0) return null;
              return (
                <View key={d.id} style={{ marginBottom: Spacing.md }}>
                  <Text style={[styles.standingDivLabel, { color: colors.textSecondary }]}>
                    {d.name}
                  </Text>
                  <StandingsTable standings={inDiv} colors={colors} />
                </View>
              );
            })
          ) : (
            <StandingsTable standings={standings.filter((s) => s.played > 0)} colors={colors} />
          )}
        </>
      )}

      {/* Registered teams */}
      <SectionHeader
        title="報名隊伍"
        count={registrations.length}
        colors={colors}
      />
      {registrations.length === 0 ? (
        <EmptyHint text="還沒有隊伍報名" colors={colors} />
      ) : (
        <View style={styles.cardList}>
          {registrations.map((r) => {
            const g = registrationGroups[r.group_id];
            const div = divisions.find((d) => d.id === r.division_id);
            const isMine = myGroups.some((mg) => mg.id === r.group_id);
            return (
              <View
                key={r.id}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{r.team_label}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                    {div?.name || '未分組'} · {regStatusLabel(r.status, r.paid)}
                    {g && g.name !== r.team_label ? ` · ${g.name}` : ''}
                  </Text>
                </View>
                {isOrganizer && (
                  <TouchableOpacity
                    onPress={() => openOrganizerActions(r, divisions, loadData)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <IconSymbol name="ellipsis" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                {!isOrganizer && isMine && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('取消報名', `確定取消「${r.team_label}」的報名？`, [
                        { text: '保留', style: 'cancel' },
                        {
                          text: '取消報名',
                          style: 'destructive',
                          onPress: async () => {
                            await withdrawRegistration(r.id);
                            loadData();
                          },
                        },
                      ]);
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>取消</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />

      {/* Modals */}
      <CreateDivisionModal
        visible={createDivOpen}
        onClose={() => setCreateDivOpen(false)}
        tournamentId={tournament.id}
        existingCount={divisions.length}
        onCreated={loadData}
        colors={colors}
      />
      <CreateMatchdayModal
        visible={createMdOpen}
        onClose={() => setCreateMdOpen(false)}
        tournamentId={tournament.id}
        onCreated={loadData}
        colors={colors}
      />
      <RegisterModal
        visible={registerOpen}
        onClose={() => setRegisterOpen(false)}
        tournamentId={tournament.id}
        userId={user?.id || ''}
        myGroups={myGroups.filter((g) => !registrations.some((r) => r.group_id === g.id))}
        divisions={divisions}
        onCreated={loadData}
        colors={colors}
      />
    </ScreenLayout>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function regStatusLabel(status: string, paid: boolean): string {
  if (status === 'withdrawn') return '已取消';
  if (paid) return '已繳費';
  if (status === 'confirmed') return '已確認';
  return '待確認';
}

function openOrganizerActions(
  r: TournamentRegistration,
  divisions: TournamentDivision[],
  reload: () => void,
) {
  const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];
  // Toggle paid
  buttons.push({
    text: r.paid ? '標記未繳費' : '標記已繳費',
    onPress: async () => {
      await updateRegistration(r.id, { paid: !r.paid, status: !r.paid ? 'paid' : 'pending' });
      reload();
    },
  });
  buttons.push({
    text: '指派分組',
    onPress: () => {
      Alert.alert('指派分組', '選擇要分到哪個層級', [
        ...divisions.map((d) => ({
          text: d.name,
          onPress: async () => {
            await updateRegistration(r.id, { division_id: d.id });
            reload();
          },
        })),
        { text: '取消分組', onPress: async () => {
          await updateRegistration(r.id, { division_id: null });
          reload();
        }},
        { text: '取消', style: 'cancel' as const },
      ]);
    },
  });
  buttons.push({
    text: '移除報名',
    style: 'destructive',
    onPress: async () => {
      await withdrawRegistration(r.id);
      reload();
    },
  });
  buttons.push({ text: '取消', style: 'cancel' });
  Alert.alert(`${r.team_label}`, '主辦操作', buttons);
}

// ── Subcomponents ──────────────────────────────────────────────────

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  onAction,
  actionLabel,
  colors,
}: {
  title: string;
  count: number;
  onAction?: () => void;
  actionLabel?: string;
  colors: any;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
        {count > 0 && (
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}> · {count}</Text>
        )}
      </Text>
      {onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StandingsTable({ standings, colors }: { standings: TeamStanding[]; colors: any }) {
  return (
    <View style={[styles.standingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.standingHeaderRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.standingRank, { color: colors.textSecondary }]}>#</Text>
        <Text style={[styles.standingTeam, { color: colors.textSecondary }]}>隊伍</Text>
        <Text style={[styles.standingCell, { color: colors.textSecondary }]}>賽</Text>
        <Text style={[styles.standingCell, { color: colors.textSecondary }]}>勝</Text>
        <Text style={[styles.standingCell, { color: colors.textSecondary }]}>負</Text>
        <Text style={[styles.standingCellWide, { color: colors.textSecondary }]}>得分</Text>
        <Text style={[styles.standingCellWide, { color: colors.textSecondary }]}>失分</Text>
        <Text style={[styles.standingCellWide, { color: colors.textSecondary }]}>淨</Text>
      </View>
      {standings.map((s, idx) => (
        <View
          key={s.group_id}
          style={[styles.standingDataRow, idx === standings.length - 1 ? null : { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
        >
          <Text style={[styles.standingRank, { color: colors.text, fontWeight: '700' }]}>{idx + 1}</Text>
          <Text
            style={[styles.standingTeam, { color: colors.text, fontWeight: idx === 0 ? '800' : '600' }]}
            numberOfLines={1}
          >
            {s.team_label}
          </Text>
          <Text style={[styles.standingCell, { color: colors.textSecondary }]}>{s.played}</Text>
          <Text style={[styles.standingCell, { color: colors.text, fontWeight: '700' }]}>{s.wins}</Text>
          <Text style={[styles.standingCell, { color: colors.textSecondary }]}>{s.losses}</Text>
          <Text style={[styles.standingCellWide, { color: colors.textSecondary }]}>{s.points_for}</Text>
          <Text style={[styles.standingCellWide, { color: colors.textSecondary }]}>{s.points_against}</Text>
          <Text
            style={[
              styles.standingCellWide,
              {
                color: s.point_diff > 0 ? colors.statusSuccess : s.point_diff < 0 ? colors.error : colors.textSecondary,
                fontWeight: '700',
              },
            ]}
          >
            {s.point_diff > 0 ? `+${s.point_diff}` : String(s.point_diff)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EmptyHint({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={[styles.emptyHint, { borderColor: colors.border }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

// ── Modals ─────────────────────────────────────────────────────────

function CreateDivisionModal({
  visible, onClose, tournamentId, existingCount, onCreated, colors,
}: {
  visible: boolean; onClose: () => void; tournamentId: string; existingCount: number; onCreated: () => void; colors: any;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  React.useEffect(() => {
    if (visible) setName(`${String.fromCharCode(65 + existingCount)} 級`);
  }, [visible, existingCount]);
  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await createDivision({ tournamentId, name: name.trim(), levelOrder: existingCount });
      onClose();
      setName('');
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
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>新增分組</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={name}
            onChangeText={setName}
            placeholder="例：A 級 / 公開組"
            placeholderTextColor={colors.placeholder}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: colors.text }, saving && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={saving}
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

function CreateMatchdayModal({
  visible, onClose, tournamentId, onCreated, colors,
}: {
  visible: boolean; onClose: () => void; tournamentId: string; onCreated: () => void; colors: any;
}) {
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const handleCreate = async () => {
    try {
      setSaving(true);
      await createMatchday({
        tournamentId,
        scheduledDate: date || null,
        location: location || null,
      });
      onClose();
      setDate('');
      setLocation('');
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
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>新增比賽日</Text>
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>日期 (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={date}
            onChangeText={setDate}
            placeholder="2026-05-04"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            地點（選填）
          </Text>
          <TextInput
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={location}
            onChangeText={setLocation}
            placeholder="例：竹科體育館"
            placeholderTextColor={colors.placeholder}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: colors.text }, saving && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={saving}
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

function RegisterModal({
  visible, onClose, tournamentId, userId, myGroups, divisions, onCreated, colors,
}: {
  visible: boolean; onClose: () => void; tournamentId: string; userId: string;
  myGroups: Group[]; divisions: TournamentDivision[]; onCreated: () => void; colors: any;
}) {
  const [pickedGroup, setPickedGroup] = useState<Group | null>(null);
  const [pickedDivision, setPickedDivision] = useState<TournamentDivision | null>(null);
  const [saving, setSaving] = useState(false);
  React.useEffect(() => {
    if (!visible) {
      setPickedGroup(null);
      setPickedDivision(null);
    }
  }, [visible]);
  const handleSubmit = async () => {
    if (!pickedGroup) return;
    try {
      setSaving(true);
      await registerGroup({
        tournamentId,
        groupId: pickedGroup.id,
        teamLabel: pickedGroup.name,
        registeredBy: userId,
        divisionId: pickedDivision?.id,
      });
      onClose();
      onCreated();
      toast.success('已送出報名，等待主辦確認');
    } catch (e: any) {
      if (e?.code === '23505') toast.error('該隊伍已報名過');
      else toast.error(e?.message || '報名失敗');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>報名隊伍</Text>
          {myGroups.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13, paddingVertical: Spacing.lg }}>
              你還沒有可報名的群組（要是該群組的 creator）
            </Text>
          ) : (
            <>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>選一個你的隊伍 / 群組</Text>
              <View style={{ gap: 8 }}>
                {myGroups.map((g) => {
                  const picked = pickedGroup?.id === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.pickerRow,
                        { borderColor: picked ? colors.text : colors.border, backgroundColor: picked ? colors.text + '11' : colors.background },
                      ]}
                      onPress={() => setPickedGroup(g)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {divisions.length > 0 && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
                    希望分組（選填，主辦可調整）
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {divisions.map((d) => {
                      const picked = pickedDivision?.id === d.id;
                      return (
                        <TouchableOpacity
                          key={d.id}
                          style={[
                            styles.pickerChip,
                            { borderColor: picked ? colors.text : colors.border, backgroundColor: picked ? colors.text : colors.background },
                          ]}
                          onPress={() => setPickedDivision(picked ? null : d)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: picked ? colors.background : colors.text, fontSize: 13, fontWeight: '600' }}>
                            {d.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={onClose}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirm,
                    { backgroundColor: colors.text },
                    (!pickedGroup || saving) && { opacity: 0.4 },
                  ]}
                  onPress={handleSubmit}
                  disabled={!pickedGroup || saving}
                >
                  <Text style={{ color: colors.background, fontSize: 14, fontWeight: '700' }}>
                    {saving ? '送出中...' : '送出報名'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  tagText: { fontSize: 11, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21 },
  infoCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: Spacing.lg },
  primaryBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' },
  statusBanner: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  sectionCount: { fontSize: 13, fontWeight: '500' },
  sectionAction: { fontSize: 13, fontWeight: '700' },
  emptyHint: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  cardList: { gap: Spacing.sm },

  // Standings table
  standingDivLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingHorizontal: Spacing.sm,
  },
  standingsCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  standingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  standingDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  standingRank: {
    width: 24,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  standingTeam: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  standingCell: {
    width: 28,
    textAlign: 'center',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  standingCellWide: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.sm },
  modalTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: Spacing.sm },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
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
  pickerRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
