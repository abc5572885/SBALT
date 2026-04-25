import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTournamentById, Tournament } from '@/services/tournaments';
import {
  deleteTeam,
  getTeamById,
  getTeamMembers,
  inviteToTeam,
  removeTeamMember,
  respondToInvite,
  searchUsersByUsername,
  TournamentTeam,
  TournamentTeamMember,
} from '@/services/tournamentTeams';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { toast } from '@/store/useToast';
import { Image } from 'expo-image';
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [team, setTeam] = useState<TournamentTeam | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [members, setMembers] = useState<TournamentTeamMember[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]>([]);
  const [inviting, setInviting] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const t = await getTeamById(id);
      if (!t) {
        setLoading(false);
        return;
      }
      setTeam(t);
      const [tourney, mems] = await Promise.all([
        getTournamentById(t.tournament_id),
        getTeamMembers(t.id),
      ]);
      setTournament(tourney);
      setMembers(mems);
      if (mems.length > 0) {
        const p = await getProfilesByIds(mems.map((m) => m.user_id));
        setProfiles(p);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="隊伍" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!team || !tournament) {
    return (
      <ScreenLayout>
        <PageHeader title="隊伍" />
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>找不到隊伍</ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  const isCaptain = user?.id === team.captain_id;
  const myMembership = members.find((m) => m.user_id === user?.id);
  const acceptedMembers = members.filter((m) => m.status === 'accepted');
  const pendingMembers = members.filter((m) => m.status === 'pending');
  const fullCount = tournament.team_size || acceptedMembers.length;

  const handleSearchInvite = async (query: string) => {
    setInviteQuery(query);
    if (query.trim().length < 2) {
      setInviteResults([]);
      return;
    }
    const excludeIds = members.map((m) => m.user_id);
    const results = await searchUsersByUsername(query.trim(), excludeIds);
    setInviteResults(results);
  };

  const handleInvite = async (userId: string) => {
    try {
      setInviting(true);
      await inviteToTeam(team.id, userId);
      setInviteOpen(false);
      setInviteQuery('');
      setInviteResults([]);
      await loadData();
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.info('此用戶已在邀請列表中');
      } else {
        toast.error(error.message || '邀請失敗');
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRespond = async (memberId: string, status: 'accepted' | 'declined') => {
    try {
      await respondToInvite(memberId, status);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || '請稍後再試');
    }
  };

  const handleRemoveMember = (member: TournamentTeamMember) => {
    const name = getDisplayName(profiles[member.user_id], member.user_id, false);
    Alert.alert('移除隊員', `確定要移除 ${name} 嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeTeamMember(member.id);
            await loadData();
          } catch (error: any) {
            toast.error(error.message || '請稍後再試');
          }
        },
      },
    ]);
  };

  const handleLeaveTeam = () => {
    if (!myMembership || isCaptain) return;
    Alert.alert('離開隊伍', '確定要離開這個隊伍嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '離開',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeTeamMember(myMembership.id);
            router.back();
          } catch (error: any) {
            toast.error(error.message || '請稍後再試');
          }
        },
      },
    ]);
  };

  const handleDeleteTeam = () => {
    if (!isCaptain) return;
    Alert.alert('解散隊伍', '確定要解散此隊伍嗎？所有隊員都會被移除，此動作無法復原。', [
      { text: '取消', style: 'cancel' },
      {
        text: '解散',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTeam(team.id);
            router.dismissAll();
          } catch (error: any) {
            toast.error(error.message || '請稍後再試');
          }
        },
      },
    ]);
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="隊伍"
        rightContent={
          isCaptain ? (
            <TouchableOpacity
              onPress={handleDeleteTeam}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <IconSymbol name="trash" size={18} color={colors.error} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Team header */}
      <View style={styles.teamHeader}>
        <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: team.tournament_id } })}
          activeOpacity={0.7}
        >
          <Text style={[styles.tournamentLink, { color: colors.primary }]}>{tournament.title}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.progressNumber, { color: colors.text }]}>
          {acceptedMembers.length}
          {tournament.team_size ? <Text style={{ color: colors.textSecondary, fontSize: 18 }}> / {tournament.team_size}</Text> : ''}
        </Text>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          {tournament.team_size
            ? acceptedMembers.length >= tournament.team_size
              ? '隊伍已滿員'
              : `還需 ${tournament.team_size - acceptedMembers.length} 人`
            : '隊員數'}
        </ThemedText>
      </View>

      {/* Accepted members */}
      <View style={styles.section}>
        <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          隊員 ({acceptedMembers.length})
        </ThemedText>
        <View style={styles.memberList}>
          {acceptedMembers.map((m) => {
            const p = profiles[m.user_id];
            const name = getDisplayName(p, m.user_id, m.user_id === user?.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => m.user_id !== user?.id && router.push(`/user/${m.user_id}`)}
                activeOpacity={m.user_id === user?.id ? 1 : 0.7}
                disabled={m.user_id === user?.id}
              >
                {p?.avatar_url ? (
                  <Image source={{ uri: p.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.text }]}>
                    <Text style={[styles.avatarText, { color: colors.background }]}>
                      {name[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{name}</Text>
                    {p?.account_type && p.account_type !== 'regular' && (
                      <VerifiedBadge accountType={p.account_type} size="small" />
                    )}
                  </View>
                  <ThemedText type="caption" style={{ color: m.role === 'captain' ? colors.primary : colors.textSecondary }}>
                    {m.role === 'captain' ? '隊長' : '隊員'}
                  </ThemedText>
                </View>
                {isCaptain && m.role !== 'captain' && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(m)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="trash" size={14} color={colors.error} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Pending invites */}
      {pendingMembers.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            待回應 ({pendingMembers.length})
          </ThemedText>
          <View style={styles.memberList}>
            {pendingMembers.map((m) => {
              const isMe = m.user_id === user?.id;
              const name = getDisplayName(profiles[m.user_id], m.user_id, isMe);
              return (
                <View key={m.id} style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.8 }]}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.disabled }]}>
                    <Text style={[styles.avatarText, { color: colors.background }]}>
                      {name[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{name}</Text>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>待回應</ThemedText>
                  </View>
                  {isMe ? (
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.statusSuccess }]}
                        onPress={() => handleRespond(m.id, 'accepted')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionBtnText}>接受</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.error }]}
                        onPress={() => handleRespond(m.id, 'declined')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionBtnText}>拒絕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : isCaptain ? (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(m)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.6}
                    >
                      <IconSymbol name="trash" size={14} color={colors.error} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />

      {/* Bottom actions */}
      <View style={styles.bottomAction}>
        {isCaptain ? (
          acceptedMembers.length < (tournament.team_size || 99) && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, Shadows.sm]}
              onPress={() => setInviteOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>邀請隊員</Text>
            </TouchableOpacity>
          )
        ) : myMembership?.status === 'accepted' ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.error, borderWidth: 1 }]}
            onPress={handleLeaveTeam}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.error, fontSize: 16, fontWeight: '700' }}>離開隊伍</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Invite modal */}
      <Modal
        visible={inviteOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setInviteOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setInviteOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>邀請隊員</Text>
              <TouchableOpacity onPress={() => setInviteOpen(false)} activeOpacity={0.6}>
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>關閉</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: Spacing.xl }}>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                value={inviteQuery}
                onChangeText={handleSearchInvite}
                placeholder="輸入用戶名稱搜尋（至少 2 字）"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />
              <ScrollView style={{ maxHeight: 300, marginTop: Spacing.lg }}>
                {inviteResults.length === 0 && inviteQuery.length >= 2 ? (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xl }}>
                    找不到符合的用戶
                  </Text>
                ) : (
                  inviteResults.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.searchItem, { borderColor: colors.border }]}
                      onPress={() => handleInvite(u.id)}
                      disabled={inviting}
                      activeOpacity={0.6}
                    >
                      {u.avatar_url ? (
                        <Image source={{ uri: u.avatar_url }} style={styles.smallAvatar} />
                      ) : (
                        <View style={[styles.smallAvatarPlaceholder, { backgroundColor: colors.text }]}>
                          <Text style={{ color: colors.background, fontSize: 13, fontWeight: '700' }}>
                            {(u.display_name || u.username || '?')[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                          {u.display_name || u.username}
                        </Text>
                        {u.username && (
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>@{u.username}</Text>
                        )}
                      </View>
                      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>邀請</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  teamHeader: { marginBottom: Spacing.lg, gap: 4 },
  teamName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tournamentLink: { fontSize: 14, fontWeight: '500' },
  progressCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
    gap: 4,
  },
  progressNumber: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  memberList: { gap: Spacing.sm },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '600' },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  bottomAction: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  btn: { paddingVertical: Spacing.lg, borderRadius: Radius.md, alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  smallAvatar: { width: 36, height: 36, borderRadius: 18 },
  smallAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
