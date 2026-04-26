/**
 * 球友邀請進活動 — 從 buddies 中勾選後批次發 event_invite 通知。
 *
 * Entry points:
 *   1. /event/new 建活動成功後 alert CTA
 *   2. /event/detail 主辦方按鈕
 *
 * 已報名（status=registered/waitlist）的球友會 disable，避免重複邀請。
 */

import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/services/appNotifications';
import { Buddy, getMyBuddies } from '@/services/buddies';
import { getEventById } from '@/services/database';
import { getProfile } from '@/services/profile';
import { Event } from '@/types/database';
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

export default function InviteBuddiesScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [event, setEvent] = useState<Event | null>(null);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id || !eventId) return;
    let cancelled = false;
    (async () => {
      try {
        const [ev, list, regs] = await Promise.all([
          getEventById(eventId),
          getMyBuddies(user.id, 200),
          supabase
            .from('registrations')
            .select('user_id')
            .eq('event_id', eventId)
            .in('status', ['registered', 'waitlist']),
        ]);
        if (cancelled) return;
        setEvent(ev as Event);
        setBuddies(list);
        setRegistered(new Set((regs.data || []).map((r) => r.user_id)));
      } catch (e) {
        console.warn('[invite-buddies] load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, eventId]);

  const toggle = (uid: string) => {
    if (registered.has(uid)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user?.id || !event || selected.size === 0) return;
    setSubmitting(true);
    try {
      const inviter = await getProfile(user.id);
      const inviterName = inviter?.display_name || inviter?.username || '球友';
      const dateText = new Date(event.scheduled_at).toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      await Promise.all(
        Array.from(selected).map((uid) =>
          createNotification({
            user_id: uid,
            type: 'event_invite',
            title: `${inviterName} 邀你參加活動`,
            body: `${event.title} · ${dateText} · ${event.location}`,
            data: { event_id: event.id },
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
      {event && (
        <View style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.eventMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {new Date(event.scheduled_at).toLocaleString('zh-TW', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · '}
            {event.location}
          </Text>
        </View>
      )}

      <FlatList
        data={buddies}
        keyExtractor={(b) => b.user_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isRegistered = registered.has(item.user_id);
          const isSelected = selected.has(item.user_id);
          return (
            <TouchableOpacity
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: colors.text, backgroundColor: colors.text + '08' },
                isRegistered && { opacity: 0.5 },
              ]}
              onPress={() => toggle(item.user_id)}
              disabled={isRegistered}
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
                  {isRegistered ? '已報名' : `${item.sharedCount} 場同框`}
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
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  eventCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 4,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  eventMeta: {
    fontSize: 12,
  },
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
  avatarInitial: {
    fontSize: 17,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  shared: {
    fontSize: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 14,
  },
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
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
