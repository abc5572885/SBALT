/**
 * 球友拉進群組 — 從 buddies 中勾選後批次發 group_invite 通知。
 *
 * Entry: /group/[id] 內的「邀請球友」按鈕（admin / member）。
 *
 * 已是成員的球友會 disable。通知收件人點開 → /group?inviteCode=XXX 自動 prompt 加入。
 */

import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createNotification } from '@/services/appNotifications';
import { Buddy, getMyBuddies } from '@/services/buddies';
import { getGroupById, getGroupMembers } from '@/services/groups';
import { getProfile } from '@/services/profile';
import { Group } from '@/types/database';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function GroupInviteBuddiesScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [group, setGroup] = useState<Group | null>(null);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [memberSet, setMemberSet] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id || !groupId) return;
    let cancelled = false;
    (async () => {
      try {
        const [g, list, members] = await Promise.all([
          getGroupById(groupId),
          getMyBuddies(user.id, 200),
          getGroupMembers(groupId),
        ]);
        if (cancelled) return;
        setGroup(g as Group);
        setBuddies(list);
        setMemberSet(new Set(members.map((m: any) => m.user_id)));
      } catch (e) {
        console.warn('[group-invite-buddies] load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, groupId]);

  const toggle = (uid: string) => {
    if (memberSet.has(uid)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user?.id || !group || selected.size === 0) return;
    setSubmitting(true);
    try {
      const inviter = await getProfile(user.id);
      const inviterName = inviter?.display_name || inviter?.username || '球友';

      await Promise.all(
        Array.from(selected).map((uid) =>
          createNotification({
            user_id: uid,
            type: 'group_invite',
            title: `${inviterName} 邀你加入群組`,
            body: `${group.name} · 點擊加入`,
            data: {
              group_id: group.id,
              invite_code: group.invite_code,
              group_name: group.name,
            },
            actor_id: user.id,
          }),
        ),
      );

      Alert.alert('已邀請', `${selected.size} 位球友會收到通知`, [
        { text: '完成', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('失敗', e?.message || '發送邀請失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="邀請球友" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (buddies.length === 0) {
    return (
      <ScreenLayout>
        <PageHeader title="邀請球友" />
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>還沒有球友</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            跟你打過的人會自動出現在這裡
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <PageHeader title="邀請球友" />
      {group && (
        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.groupTitle, { color: colors.text }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>
            {memberSet.size} 位成員
          </Text>
        </View>
      )}

      <FlatList
        data={buddies}
        keyExtractor={(b) => b.user_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMember = memberSet.has(item.user_id);
          const isSelected = selected.has(item.user_id);
          return (
            <TouchableOpacity
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: colors.text, backgroundColor: colors.text + '08' },
                isMember && { opacity: 0.5 },
              ]}
              onPress={() => toggle(item.user_id)}
              disabled={isMember}
              activeOpacity={0.7}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.text }]}>
                  <Text style={[styles.avatarInitial, { color: colors.background }]}>
                    {(item.display_name || item.username || '?')[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.display_name || item.username || '球友'}
                </Text>
                <Text style={[styles.shared, { color: colors.textSecondary }]}>
                  {isMember ? '已是成員' : `${item.sharedCount} 場同框`}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: colors.text, borderColor: colors.text },
                ]}
              >
                {isSelected && <Text style={[styles.checkMark, { color: colors.background }]}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.text },
            Shadows.sm,
            (selected.size === 0 || submitting) && { backgroundColor: colors.disabled },
          ]}
          onPress={handleSubmit}
          disabled={selected.size === 0 || submitting}
          activeOpacity={0.85}
        >
          <Text style={[styles.submitText, { color: colors.background }]}>
            {submitting ? '發送中...' : selected.size === 0 ? '選擇球友' : `邀請 ${selected.size} 位`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  groupCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 4,
  },
  groupTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  groupMeta: { fontSize: 12 },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 140,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { fontSize: 17, fontWeight: '700' },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  shared: { fontSize: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 14, fontWeight: '800', lineHeight: 14 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitText: { fontSize: 15, fontWeight: '700' },
});
