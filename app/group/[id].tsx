import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createGroupPost,
  deleteGroupPost,
  getGroupById,
  getGroupEvents,
  getGroupMembers,
  getGroupPosts,
  leaveGroup,
  removeMember,
  setMemberRole,
} from '@/services/groups';
import { getTournamentsByGroup, Tournament } from '@/services/tournaments';
import { getVenuesByOperator, Venue } from '@/services/venues';
import { getStatusLabel } from '@/constants/tournaments';
import { getGroupTypeLabel } from '@/constants/groupTypes';
import { Event, Group, GroupMember, GroupPost } from '@/types/database';
import { getDisplayName, getProfilesByIds, Profile } from '@/services/profile';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { formatDateChinese } from '@/utils/dateFormat';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'events' | 'tournaments' | 'venues' | 'members'>('posts');

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      const [groupData, membersData, postsData, eventsData, tournamentsData, venuesData] = await Promise.all([
        getGroupById(id),
        getGroupMembers(id),
        getGroupPosts(id),
        getGroupEvents(id),
        getTournamentsByGroup(id),
        getVenuesByOperator(id),
      ]);
      setGroup(groupData);
      setMembers(membersData);
      setPosts(postsData);
      setEvents(eventsData);
      setTournaments(tournamentsData);
      setVenues(venuesData);
      if (groupData?.type === 'competition_org' && activeTab === 'posts') {
        setActiveTab('tournaments');
      }
      if (groupData?.type === 'venue_operator' && activeTab === 'posts') {
        setActiveTab('venues');
      }

      // Load profiles for all members
      const userIds = membersData.map((m: any) => m.user_id);
      const profileMap = await getProfilesByIds(userIds);
      setProfiles(profileMap);
    } catch (error) {
      console.error('載入群組失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!user || !newPost.trim()) return;
    try {
      setPosting(true);
      await createGroupPost({
        group_id: id,
        user_id: user.id,
        content: newPost.trim(),
      });
      setNewPost('');
      const updatedPosts = await getGroupPosts(id);
      setPosts(updatedPosts);
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '發送失敗');
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert('刪除', '確定要刪除此訊息嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteGroupPost(postId);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!group) return;
    await Share.share({
      message: `加入「${group.name}」\n\n邀請碼：${group.invite_code}\n\n在 SBALT 輸入邀請碼即可加入`,
    });
  };

  const handleLeave = () => {
    if (!user || !group) return;
    if (group.creator_id === user.id) {
      Alert.alert('無法退出', '您是群組建立者，請先轉讓管理員或刪除群組');
      return;
    }
    Alert.alert('退出群組', `確定要退出「${group.name}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          await leaveGroup(id, user.id);
          router.back();
        },
      },
    ]);
  };

  const isCaptain = group?.creator_id === user?.id;
  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = isCaptain || myRole === 'admin';

  const handleMemberAction = (member: GroupMember) => {
    if (!group || !user) return;
    if (member.user_id === user.id) return;
    const isMemberCaptain = member.user_id === group.creator_id;
    const isMemberAdmin = member.role === 'admin' && !isMemberCaptain;
    if (isMemberCaptain) return; // 隊長不能被操作

    const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];

    if (isCaptain) {
      // Captain can promote / demote / remove
      if (isMemberAdmin) {
        buttons.push({
          text: '降為一般成員',
          onPress: async () => {
            try {
              await setMemberRole(group.id, member.user_id, 'member');
              await loadData();
            } catch (e: any) {
              Alert.alert('失敗', e?.message || '操作失敗');
            }
          },
        });
      } else {
        buttons.push({
          text: '升為副隊長',
          onPress: async () => {
            try {
              await setMemberRole(group.id, member.user_id, 'admin');
              await loadData();
            } catch (e: any) {
              Alert.alert('失敗', e?.message || '操作失敗');
            }
          },
        });
      }
    }

    if (isCaptain || (myRole === 'admin' && !isMemberAdmin)) {
      buttons.push({
        text: '移除成員',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(group.id, member.user_id);
            await loadData();
          } catch (e: any) {
            Alert.alert('失敗', e?.message || '移除失敗');
          }
        },
      });
    }

    if (buttons.length === 0) return;
    buttons.push({ text: '取消', style: 'cancel' });
    Alert.alert(getDisplayName(profiles[member.user_id], member.user_id, false), undefined, buttons);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!group) return null;

  const sportLabel = SPORT_OPTIONS.find((s) => s.key === group.sport_type)?.label || '';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader title={group.name} />

      {/* Group header */}
      <View style={[styles.header, { paddingHorizontal: Spacing.lg }]}>
        <View style={styles.headerInfo}>
          <View style={[styles.typeTag, { borderColor: colors.border }]}>
            <ThemedText type="label" style={{ color: colors.textSecondary }}>
              {getGroupTypeLabel(group.type)}
            </ThemedText>
          </View>
          {sportLabel && (
            <View style={[styles.sportTag, { backgroundColor: colors.primary + '12' }]}>
              <ThemedText type="label" style={{ color: colors.primary }}>{sportLabel}</ThemedText>
            </View>
          )}
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {members.length} 位成員
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn} activeOpacity={0.6}>
            <IconSymbol name="paperplane.fill" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLeave} style={styles.headerBtn} activeOpacity={0.6}>
            <IconSymbol name="arrow.right.square" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Invite code + buddy invite */}
      <View style={[styles.inviteBar, { backgroundColor: colors.surface, marginHorizontal: Spacing.lg, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>邀請碼</ThemedText>
          <Text style={[styles.inviteCode, { color: colors.primary }]}>{group.invite_code}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/group/invite-buddies', params: { groupId: id } })}
          style={[styles.buddyInviteBtn, { backgroundColor: colors.text }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.buddyInviteText, { color: colors.background }]}>邀請球友</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      {(() => {
        const isCompetitionOrg = group.type === 'competition_org';
        const isVenueOperator = group.type === 'venue_operator';
        const tabs: { key: 'tournaments' | 'posts' | 'events' | 'venues' | 'members'; label: string }[] = isCompetitionOrg
          ? [
              { key: 'tournaments', label: '賽事' },
              { key: 'posts', label: '公告' },
              { key: 'members', label: '成員' },
            ]
          : isVenueOperator
          ? [
              { key: 'venues', label: '場地' },
              { key: 'posts', label: '公告' },
              { key: 'members', label: '成員' },
            ]
          : [
              { key: 'posts', label: '公告' },
              { key: 'events', label: '活動' },
              { key: 'members', label: '成員' },
            ];
        return (
          <View style={[styles.tabs, { borderBottomColor: colors.border, marginHorizontal: Spacing.lg }]}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}
                >
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        );
      })()}

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: Spacing.lg }}>
        {activeTab === 'posts' && (
          <>
            {/* Post input */}
            <View style={[styles.postInput, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
              <TextInput
                style={[styles.postTextInput, { color: colors.text }]}
                value={newPost}
                onChangeText={setNewPost}
                placeholder="發布公告..."
                placeholderTextColor={colors.placeholder}
                multiline
              />
              <TouchableOpacity
                style={[styles.postBtn, { backgroundColor: colors.primary }, (!newPost.trim() || posting) && { opacity: 0.4 }]}
                onPress={handlePost}
                disabled={!newPost.trim() || posting}
              >
                <IconSymbol name="paperplane.fill" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

            {posts.length === 0 ? (
              <View style={styles.emptySection}>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>尚無公告</ThemedText>
              </View>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
                  <View style={styles.postHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                      <ThemedText type="label">
                        {getDisplayName(profiles[post.user_id], post.user_id, post.user_id === user?.id)}
                      </ThemedText>
                      {profiles[post.user_id]?.account_type !== 'regular' && (
                        <VerifiedBadge accountType={profiles[post.user_id].account_type} size="small" />
                      )}
                    </View>
                    <View style={styles.postHeaderRight}>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                        {new Date(post.created_at).toLocaleDateString('zh-TW')}
                      </ThemedText>
                      {post.user_id === user?.id && (
                        <TouchableOpacity onPress={() => handleDeletePost(post.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <IconSymbol name="trash" size={14} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <ThemedText style={styles.postContent}>{post.content}</ThemedText>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'tournaments' && (
          <>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.createEventBtn, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={() => router.push({ pathname: '/tournament/new', params: { groupId: id } })}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={16} color="#FFF" />
                <Text style={styles.createEventText}>建立賽事</Text>
              </TouchableOpacity>
            )}
            {tournaments.length === 0 ? (
              <View style={styles.emptySection}>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>尚無賽事</ThemedText>
              </View>
            ) : (
              tournaments.map((t) => {
                const sportLabel2 = SPORT_OPTIONS.find((s) => s.key === t.sport_type)?.label || '';
                const startStr = new Date(t.start_date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tournamentCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                    onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: t.id } })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tournamentTopRow}>
                      <View style={[styles.statusPill, { backgroundColor: colors.statusSuccess + '15' }]}>
                        <ThemedText type="label" style={{ color: colors.statusSuccess }}>
                          {getStatusLabel(t.status)}
                        </ThemedText>
                      </View>
                      {t.entry_fee > 0 && (
                        <ThemedText type="label" style={{ color: colors.primary }}>
                          NT$ {t.entry_fee}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={styles.tournamentTitle}>{t.title}</ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      {startStr} · {sportLabel2} · {t.location}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {activeTab === 'venues' && (
          <>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.createEventBtn, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={() => router.push({ pathname: '/venue/new', params: { groupId: id } })}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={16} color="#FFF" />
                <Text style={styles.createEventText}>新增場地</Text>
              </TouchableOpacity>
            )}
            {venues.length === 0 ? (
              <View style={styles.emptySection}>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>尚無場地</ThemedText>
              </View>
            ) : (
              venues.map((v) => {
                const sportLabels = v.sport_types.map((k) => SPORT_OPTIONS.find((s) => s.key === k)?.label || k).join('、');
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.tournamentCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                    onPress={() => router.push({ pathname: '/venue/[id]', params: { id: v.id } })}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.tournamentTitle}>{v.name}</ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                      {v.address}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      {sportLabels}{v.hourly_rate ? ` · NT$ ${v.hourly_rate}/hr` : ''}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {activeTab === 'events' && (
          <>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.createEventBtn, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={() => router.push({ pathname: '/event/new', params: { groupId: id } })}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={16} color="#FFF" />
                <Text style={styles.createEventText}>建立群組活動</Text>
              </TouchableOpacity>
            )}
            {events.length === 0 ? (
              <View style={styles.emptySection}>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>尚無群組活動</ThemedText>
              </View>
            ) : (
              events.map((evt) => (
                <TouchableOpacity
                  key={evt.id}
                  style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                  onPress={() => router.push({ pathname: '/event/detail', params: { eventId: evt.id } })}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.eventTitle}>{evt.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                    {formatDateChinese(new Date(evt.scheduled_at))} · {evt.location}
                  </ThemedText>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {activeTab === 'members' && (
          <View style={styles.membersList}>
            {members.map((member, index) => {
              const isMemberCaptain = member.user_id === group.creator_id;
              const isMemberAdmin = member.role === 'admin' && !isMemberCaptain;
              const roleLabel = isMemberCaptain ? '隊長' : isMemberAdmin ? '副隊長' : null;
              const roleColor = isMemberCaptain ? colors.error : isMemberAdmin ? colors.primary : colors.disabled;
              const canManage =
                member.user_id !== user?.id &&
                !isMemberCaptain &&
                (isCaptain || (myRole === 'admin' && !isMemberAdmin));

              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                  onPress={() => canManage && handleMemberAction(member)}
                  disabled={!canManage}
                  activeOpacity={canManage ? 0.6 : 1}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: roleColor }]}>
                    <Text style={styles.memberAvatarText}>{index + 1}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                      <ThemedText style={styles.memberName}>
                        {getDisplayName(profiles[member.user_id], member.user_id, member.user_id === user?.id)}
                      </ThemedText>
                      {profiles[member.user_id]?.account_type !== 'regular' && (
                        <VerifiedBadge accountType={profiles[member.user_id].account_type} size="small" />
                      )}
                    </View>
                    {roleLabel && (
                      <ThemedText type="caption" style={{ color: roleColor }}>{roleLabel}</ThemedText>
                    )}
                  </View>
                  {canManage && (
                    <IconSymbol name="ellipsis" size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  headerBtn: { padding: Spacing.sm },
  inviteBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.sm, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.md,
  },
  inviteCode: { fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  buddyInviteBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  buddyInviteText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sportTag: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  typeTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tournamentCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tournamentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tournamentTitle: { fontSize: 16, fontWeight: '700' },
  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  tabText: { fontSize: 14, fontWeight: '600' },
  // Posts
  postInput: {
    flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.md,
    borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.lg, gap: Spacing.sm,
  },
  postTextInput: { flex: 1, fontSize: 15, maxHeight: 80 },
  postBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  postCard: {
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  postContent: { fontSize: 15, lineHeight: 22 },
  // Events
  createEventBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: Radius.sm, marginBottom: Spacing.lg,
  },
  createEventText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  eventCard: {
    padding: Spacing.lg, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm, gap: Spacing.xs,
  },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  // Members
  membersList: { gap: Spacing.sm },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md,
  },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 15, fontWeight: '500' },
  emptySection: { padding: Spacing.xxl, alignItems: 'center' },
});
