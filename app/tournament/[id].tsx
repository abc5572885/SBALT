import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getFormatLabel, getStatusLabel } from '@/constants/tournaments';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupById } from '@/services/groups';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { toast } from '@/store/useToast';
import {
  cancelTournamentRegistration,
  getTournamentById,
  getTournamentRegistrations,
  registerForTournament,
  Tournament,
  TournamentRegistration,
} from '@/services/tournaments';
import {
  getTeamMembers,
  getTeamsForTournament,
  TournamentTeam,
  TournamentTeamMember,
} from '@/services/tournamentTeams';
import { Group } from '@/types/database';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
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
  const [group, setGroup] = useState<Group | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TournamentTeamMember[]>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const t = await getTournamentById(id);
      if (!t) {
        setLoading(false);
        return;
      }
      setTournament(t);
      const [g, regs, teamsData] = await Promise.all([
        getGroupById(t.organizer_group_id),
        getTournamentRegistrations(t.id),
        getTeamsForTournament(t.id),
      ]);
      setGroup(g);
      const active = regs.filter((r) => r.status !== 'cancelled');
      setRegistrations(active);
      setTeams(teamsData);

      // Load team members for each team
      if (teamsData.length > 0) {
        const membersByTeam: Record<string, TournamentTeamMember[]> = {};
        const memberUserIds: string[] = [];
        for (const team of teamsData) {
          const members = await getTeamMembers(team.id);
          membersByTeam[team.id] = members;
          members.forEach((m) => memberUserIds.push(m.user_id));
        }
        setTeamMembersMap(membersByTeam);
        const allUserIds = [...new Set([...active.map((r) => r.user_id), ...memberUserIds])];
        if (allUserIds.length > 0) {
          const profs = await getProfilesByIds(allUserIds);
          setProfiles(profs);
        }
      } else if (active.length > 0) {
        const profs = await getProfilesByIds(active.map((r) => r.user_id));
        setProfiles(profs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const myRegistration = registrations.find((r) => r.user_id === user?.id);
  const isOrganizer = group?.creator_id === user?.id;
  const spotsLeft = tournament?.max_participants
    ? tournament.max_participants - registrations.length
    : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const registrationClosed = tournament?.registration_deadline
    ? new Date(tournament.registration_deadline) < new Date()
    : false;

  const handleRegister = async () => {
    if (!user || !tournament) return;
    try {
      setProcessing(true);
      await registerForTournament(tournament.id, user.id);
      await loadData();
      toast.success(`已報名「${tournament.title}」`);
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.info('您已報名過此賽事');
      } else {
        toast.error(error.message || '報名失敗');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!user || !tournament) return;
    Alert.alert('取消報名', '確定要取消報名嗎？', [
      { text: '返回', style: 'cancel' },
      {
        text: '取消報名',
        style: 'destructive',
        onPress: async () => {
          try {
            setProcessing(true);
            await cancelTournamentRegistration(tournament.id, user.id);
            await loadData();
          } catch (e: any) {
            Alert.alert('失敗', e.message || '請稍後再試');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!tournament) return;
    const dateStr = new Date(tournament.start_date).toLocaleDateString('zh-TW');
    const lines = [
      tournament.title,
      `${dateStr} · ${tournament.location}${tournament.venue ? ` · ${tournament.venue}` : ''}`,
      tournament.entry_fee > 0 ? `報名費 NT$ ${tournament.entry_fee}` : '免費報名',
    ];
    if (tournament.prize_pool) lines.push(`獎金：${tournament.prize_pool}`);
    lines.push('', `SBALT 報名連結：sbalt://open?tournament=${tournament.id}`);
    await Share.share({ message: lines.join('\n') });
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
  const dateOpts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const startStr = new Date(tournament.start_date).toLocaleDateString('zh-TW', dateOpts);
  const endStr = tournament.end_date ? new Date(tournament.end_date).toLocaleDateString('zh-TW', dateOpts) : null;
  const deadlineStr = tournament.registration_deadline
    ? new Date(tournament.registration_deadline).toLocaleDateString('zh-TW', dateOpts)
    : null;

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="賽事詳情"
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            {isOrganizer && (
              <TouchableOpacity
                onPress={() => router.push(`/tournament/edit/${tournament.id}`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <IconSymbol name="pencil" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <IconSymbol name="paperplane.fill" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Status + Title */}
      <View style={styles.titleSection}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: colors.statusSuccess + '15' }]}>
            <ThemedText type="label" style={{ color: colors.statusSuccess }}>
              {getStatusLabel(tournament.status)}
            </ThemedText>
          </View>
          {sportLabel && (
            <View style={[styles.sportBadge, { borderColor: colors.border }]}>
              <ThemedText type="label" style={{ color: colors.textSecondary }}>{sportLabel}</ThemedText>
            </View>
          )}
          <View style={[styles.sportBadge, { borderColor: colors.border }]}>
            <ThemedText type="label" style={{ color: colors.textSecondary }}>
              {getFormatLabel(tournament.format)}
            </ThemedText>
          </View>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{tournament.title}</Text>
      </View>

      {/* Organizer */}
      {group && (
        <TouchableOpacity
          style={[styles.organizerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
          activeOpacity={0.7}
        >
          <View style={styles.organizerInfo}>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>主辦單位</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <Text style={[styles.organizerName, { color: colors.text }]}>{group.name}</Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
        </TouchableOpacity>
      )}

      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
        <InfoRow icon="calendar" label="開始" value={startStr} colors={colors} />
        {endStr && <InfoRow icon="calendar" label="結束" value={endStr} colors={colors} />}
        {deadlineStr && (
          <InfoRow
            icon="calendar"
            label="報名截止"
            value={deadlineStr}
            colors={colors}
            valueColor={registrationClosed ? colors.error : colors.text}
          />
        )}
        <InfoRow
          icon="location.fill"
          label="地點"
          value={tournament.venue ? `${tournament.location} · ${tournament.venue}` : tournament.location}
          colors={colors}
        />
        <InfoRow
          icon="person.fill"
          label="報名人數"
          value={
            tournament.max_participants
              ? `${registrations.length} / ${tournament.max_participants}`
              : `${registrations.length} 人`
          }
          colors={colors}
        />
        <InfoRow
          icon="star.fill"
          label="報名費"
          value={tournament.entry_fee > 0 ? `NT$ ${tournament.entry_fee}` : '免費'}
          colors={colors}
        />
        {tournament.payment_info && tournament.entry_fee > 0 && (
          <InfoRow icon="star.fill" label="付款方式" value={tournament.payment_info} colors={colors} />
        )}
        {tournament.prize_pool && (
          <InfoRow icon="star.fill" label="獎金" value={tournament.prize_pool} colors={colors} />
        )}
      </View>

      {/* Description */}
      {tournament.description && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            賽事介紹
          </ThemedText>
          <Text style={[styles.body, { color: colors.text }]}>{tournament.description}</Text>
        </View>
      )}

      {/* Rules */}
      {tournament.rules && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            賽事規則
          </ThemedText>
          <Text style={[styles.body, { color: colors.text }]}>{tournament.rules}</Text>
        </View>
      )}

      {/* Participants / Teams */}
      {tournament.registration_type === 'team' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              參賽隊伍 ({teams.length}){tournament.team_size ? ` · 每隊 ${tournament.team_size} 人` : ''}
            </ThemedText>
          </View>
          {teams.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>尚無隊伍建立</ThemedText>
            </View>
          ) : (
            <View style={styles.participants}>
              {teams.map((team, idx) => {
                const members = teamMembersMap[team.id] || [];
                const accepted = members.filter((m) => m.status === 'accepted');
                const pending = members.filter((m) => m.status === 'pending');
                const memberNames = accepted.map((m) =>
                  getDisplayName(profiles[m.user_id], m.user_id, m.user_id === user?.id)
                ).join('、');
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[styles.teamCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/tournament/team/[id]', params: { id: team.id } })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.teamHeader}>
                      <View style={[styles.participantIdx, { backgroundColor: colors.primary }]}>
                        <Text style={styles.participantIdxText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.participantName, { color: colors.text, fontSize: 16 }]}>{team.name}</Text>
                        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                          {accepted.length}{tournament.team_size ? ` / ${tournament.team_size}` : ''} 人
                          {pending.length > 0 && ` · ${pending.length} 人待回應`}
                        </ThemedText>
                      </View>
                      <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
                    </View>
                    {memberNames && (
                      <ThemedText type="caption" style={{ color: colors.textSecondary, marginTop: Spacing.sm }} numberOfLines={2}>
                        {memberNames}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            參賽者 ({registrations.length})
          </ThemedText>
          {registrations.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>尚無人報名</ThemedText>
            </View>
          ) : (
            <View style={styles.participants}>
              {registrations.map((r, idx) => {
                const name = getDisplayName(profiles[r.user_id], r.user_id, r.user_id === user?.id);
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.participantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => r.user_id !== user?.id && router.push(`/user/${r.user_id}`)}
                    activeOpacity={r.user_id === user?.id ? 1 : 0.7}
                    disabled={r.user_id === user?.id}
                  >
                    <View style={[styles.participantIdx, { backgroundColor: colors.primary }]}>
                      <Text style={styles.participantIdxText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                        <Text style={[styles.participantName, { color: colors.text }]}>{name}</Text>
                        {profiles[r.user_id]?.account_type && profiles[r.user_id]?.account_type !== 'regular' && (
                          <VerifiedBadge accountType={profiles[r.user_id].account_type} size="small" />
                        )}
                      </View>
                    </View>
                    {tournament.entry_fee > 0 && (
                      <View style={[
                        styles.payBadge,
                        { backgroundColor: r.payment_status === 'paid' ? colors.statusSuccess + '15' : colors.secondary },
                      ]}>
                        <ThemedText type="label" style={{
                          color: r.payment_status === 'paid' ? colors.statusSuccess : colors.textSecondary,
                        }}>
                          {r.payment_status === 'paid' ? '已付款' : '未付款'}
                        </ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />

      {/* Bottom action */}
      {!isOrganizer && tournament.registration_type === 'team' ? (
        <View style={styles.bottomAction}>
          {(() => {
            // Find if user is already in a team
            const myTeam = teams.find((t) =>
              (teamMembersMap[t.id] || []).some((m) => m.user_id === user?.id && m.status !== 'declined')
            );
            if (myTeam) {
              return (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }, Shadows.sm]}
                  onPress={() => router.push({ pathname: '/tournament/team/[id]', params: { id: myTeam.id } })}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                    管理我的隊伍「{myTeam.name}」
                  </Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: colors.primary },
                  Shadows.sm,
                  (processing || registrationClosed) && { opacity: 0.4 },
                ]}
                onPress={() => router.push({ pathname: '/tournament/team/new', params: { tournamentId: tournament.id } })}
                disabled={processing || registrationClosed}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                  {registrationClosed ? '報名已截止' : '建立隊伍 / 報名'}
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      ) : !isOrganizer ? (
        <View style={styles.bottomAction}>
          {myRegistration ? (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.error, borderWidth: 1 }]}
              onPress={handleCancel}
              disabled={processing}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>
                {processing ? '處理中...' : '取消報名'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: colors.primary },
                Shadows.sm,
                (processing || isFull || registrationClosed) && { opacity: 0.4 },
              ]}
              onPress={handleRegister}
              disabled={processing || isFull || registrationClosed}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                {processing ? '報名中...'
                  : registrationClosed ? '報名已截止'
                  : isFull ? '已額滿'
                  : tournament.entry_fee > 0 ? `報名 · NT$ ${tournament.entry_fee}` : '立即報名'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {isOrganizer && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
              您是主辦方 · {registrations.length} 人報名
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenLayout>
  );
}

function InfoRow({ label, value, colors, valueColor }: {
  icon?: any;
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor || colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  titleSection: { marginBottom: Spacing.lg, gap: Spacing.md },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  sportBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  organizerInfo: { flex: 1, gap: 2 },
  organizerName: { fontSize: 15, fontWeight: '600' },
  infoCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 2 },
  infoLabel: { fontSize: 12, width: 76, fontWeight: '600', letterSpacing: -0.1, paddingTop: 1 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 19 },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontSize: 15, lineHeight: 22 },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  participants: { gap: Spacing.sm },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  participantIdx: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantIdxText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  participantName: { fontSize: 14, fontWeight: '500' },
  payBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  bottomAction: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  btn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
