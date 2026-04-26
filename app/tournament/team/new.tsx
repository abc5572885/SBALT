import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyGroups, getGroupMembers } from '@/services/groups';
import { getProfilesByIds, Profile } from '@/services/profile';
import { getTournamentById, Tournament } from '@/services/tournaments';
import { createTeam, inviteToTeam } from '@/services/tournamentTeams';
import { toast } from '@/store/useToast';
import { Group } from '@/types/database';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Mode = 'choose' | 'fresh' | 'group';

export default function NewTeamScreen() {
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [mode, setMode] = useState<Mode>('choose');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fresh team
  const [name, setName] = useState('');

  // Group team
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<{ user_id: string; profile?: Profile }[]>([]);
  const [pickedUserIds, setPickedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!tournamentId || !user?.id) return;
    Promise.all([getTournamentById(tournamentId), getMyGroups(user.id)])
      .then(([t, groups]) => {
        setTournament(t);
        // Filter groups matching tournament sport (or those with no sport_type)
        const filtered = (groups as Group[]).filter(
          (g) => !t?.sport_type || !g.sport_type || g.sport_type === t.sport_type,
        );
        setMyGroups(filtered);
      })
      .finally(() => setLoading(false));
  }, [tournamentId, user?.id]);

  const handlePickGroup = async (g: Group) => {
    setSelectedGroup(g);
    setName(g.name);
    try {
      const members = await getGroupMembers(g.id);
      const otherIds = members.map((m: any) => m.user_id).filter((id: string) => id !== user?.id);
      const profiles = otherIds.length > 0 ? await getProfilesByIds(otherIds) : {};
      const list = otherIds.map((id: string) => ({ user_id: id, profile: profiles[id] }));
      setGroupMembers(list);
      // Default: pre-pick all
      setPickedUserIds(new Set(otherIds));
    } catch (e: any) {
      toast.error('載入群組成員失敗');
    }
  };

  const togglePick = (uid: string) => {
    setPickedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleCreateFresh = async () => {
    if (!user || !tournamentId || !name.trim()) {
      toast.error('請輸入隊伍名稱');
      return;
    }
    try {
      setSaving(true);
      const team = await createTeam({ tournament_id: tournamentId, name: name.trim(), captain_id: user.id });
      router.replace({ pathname: '/tournament/team/[id]', params: { id: team.id } });
    } catch (error: any) {
      if (error?.code === '23505') toast.error('此賽事已有同名隊伍，請換一個');
      else toast.error(error.message || '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFromGroup = async () => {
    if (!user || !tournamentId || !selectedGroup || !name.trim()) {
      toast.error('請完整填寫');
      return;
    }
    try {
      setSaving(true);
      const team = await createTeam({
        tournament_id: tournamentId,
        name: name.trim(),
        captain_id: user.id,
      });

      // Bulk invite picked members
      const ids = Array.from(pickedUserIds);
      const results = await Promise.allSettled(ids.map((uid) => inviteToTeam(team.id, uid)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.info(`${ids.length - failed}/${ids.length} 位隊員已邀請`);
      }

      router.replace({ pathname: '/tournament/team/[id]', params: { id: team.id } });
    } catch (error: any) {
      if (error?.code === '23505') toast.error('此賽事已有同名隊伍，請換一個');
      else toast.error(error.message || '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="建立隊伍" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!tournament) return null;

  const teamSizeNote = tournament.team_size ? `每隊 ${tournament.team_size} 人` : null;

  return (
    <ScreenLayout scrollable>
      <PageHeader title="建立隊伍" />

      <View style={styles.info}>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>賽事</ThemedText>
        <Text style={[styles.tournamentName, { color: colors.text }]}>{tournament.title}</Text>
        {teamSizeNote && (
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>{teamSizeNote}</ThemedText>
        )}
      </View>

      {mode === 'choose' && (
        <View style={{ gap: Spacing.md }}>
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
            onPress={() => setMode('group')}
            activeOpacity={0.7}
            disabled={myGroups.length === 0}
          >
            <Text style={[styles.modeTitle, { color: myGroups.length === 0 ? colors.disabled : colors.text }]}>
              從我的群組
            </Text>
            <Text style={[styles.modeSub, { color: colors.textSecondary }]}>
              {myGroups.length === 0
                ? '你還沒有相同運動的群組'
                : `從 ${myGroups.length} 個群組選一個，整隊一起報名`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
            onPress={() => setMode('fresh')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeTitle, { color: colors.text }]}>自己組一隊</Text>
            <Text style={[styles.modeSub, { color: colors.textSecondary }]}>建立後再逐一邀請隊員</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'fresh' && (
        <>
          <View style={styles.field}>
            <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>隊伍名稱 *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="例：竹北快攻"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={[styles.hintCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText type="caption" style={{ color: colors.textSecondary, lineHeight: 20 }}>
              建立後你會成為隊長。{'\n'}
              下一步可邀請隊員加入，隊員同意後才算完成報名。
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
            onPress={handleCreateFresh}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.submitText}>{saving ? '建立中...' : '建立隊伍'}</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'group' && !selectedGroup && (
        <ScrollView style={{ marginTop: Spacing.md }}>
          {myGroups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handlePickGroup(g)}
              activeOpacity={0.7}
            >
              <Text style={[styles.groupName, { color: colors.text }]}>{g.name}</Text>
              {g.description && (
                <Text style={[styles.groupDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                  {g.description}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {mode === 'group' && selectedGroup && (
        <>
          <View style={styles.field}>
            <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>隊伍名稱 *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
              邀請的隊員（{pickedUserIds.size} / {groupMembers.length}）
            </ThemedText>
            {groupMembers.length === 0 ? (
              <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
                這個群組除了你之外沒有其他成員。建立後再邀請。
              </Text>
            ) : (
              groupMembers.map((m) => {
                const isPicked = pickedUserIds.has(m.user_id);
                const display = m.profile?.display_name || m.profile?.username || '球友';
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    style={[
                      styles.memberRow,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isPicked && { borderColor: colors.text, backgroundColor: colors.text + '08' },
                    ]}
                    onPress={() => togglePick(m.user_id)}
                    activeOpacity={0.7}
                  >
                    {m.profile?.avatar_url ? (
                      <Image source={{ uri: m.profile.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: colors.text }]}>
                        <Text style={[styles.avatarInitial, { color: colors.background }]}>
                          {display[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.memberName, { color: colors.text }]}>{display}</Text>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: colors.border },
                        isPicked && { backgroundColor: colors.text, borderColor: colors.text },
                      ]}
                    >
                      {isPicked && <Text style={[styles.checkMark, { color: colors.background }]}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
            onPress={handleCreateFromGroup}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.submitText}>
              {saving ? '建立中...' : `建立隊伍${pickedUserIds.size > 0 ? ` 並邀請 ${pickedUserIds.size} 人` : ''}`}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  info: { marginBottom: Spacing.xl, gap: 2 },
  tournamentName: { fontSize: 18, fontWeight: '700' },
  modeCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  modeTitle: { fontSize: 16, fontWeight: '700' },
  modeSub: { fontSize: 13 },
  field: { marginBottom: Spacing.xl, gap: Spacing.sm },
  label: { textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  hintCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  submitBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  groupRow: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupDesc: { fontSize: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { fontSize: 14, fontWeight: '700' },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 12, fontWeight: '800', lineHeight: 12 },
  emptyMsg: { fontSize: 13, lineHeight: 19, paddingVertical: Spacing.md },
});
