import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { CheckInShareModal } from '@/components/shareCards/CheckInShareModal';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CHECK_IN_FIELDS, CheckIn, getCheckInById, respondToTagging } from '@/services/checkIns';
import { Profile, getProfilesByIds } from '@/services/profile';
import { toast } from '@/store/useToast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CheckInDetailScreen() {
  const { id, share } = useLocalSearchParams<{ id: string; share?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const ci = await getCheckInById(id);
      setCheckIn(ci);
      if (ci) {
        const ids = [ci.user_id, ...(ci.partners || []).map((p) => p.user_id)];
        const map = await getProfilesByIds(ids);
        setProfiles(map);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (share === '1' && checkIn) {
      setShareOpen(true);
    }
  }, [share, checkIn]);

  const handleRespond = async (status: 'accepted' | 'declined') => {
    if (!user || !checkIn) return;
    try {
      setResponding(true);
      await respondToTagging(checkIn.id, user.id, status);
      toast.success(status === 'accepted' ? '已接受標記' : '已拒絕標記');
      await load();
    } catch (e: any) {
      toast.error(e.message || '操作失敗');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="打卡紀錄" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!checkIn) {
    return (
      <ScreenLayout>
        <PageHeader title="打卡紀錄" />
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            找不到此打卡紀錄
          </ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  const sportLabel = SPORT_OPTIONS.find((s) => s.key === checkIn.sport_type)?.label || checkIn.sport_type;
  const owner = profiles[checkIn.user_id];
  const ownerName = owner?.display_name || owner?.username || '用戶';
  const isOwner = user?.id === checkIn.user_id;

  const myPartner = (checkIn.partners || []).find((p) => p.user_id === user?.id);
  const isPending = !!myPartner && myPartner.status === 'pending';

  const fields = CHECK_IN_FIELDS[checkIn.sport_type] || [];
  const statEntries = fields
    .map((f) => ({ label: f.label, value: checkIn.stats?.[f.key] }))
    .filter((e) => e.value !== undefined && e.value !== null && e.value !== 0);

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="打卡紀錄"
        rightContent={
          <TouchableOpacity
            onPress={() => setShareOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
          >
            <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Header card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
        <View style={styles.cardTop}>
          <View style={[styles.sportPill, { backgroundColor: colors.primary + '15' }]}>
            <ThemedText type="label" style={{ color: colors.primary }}>{sportLabel}</ThemedText>
          </View>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {formatDateTime(checkIn.played_at)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.ownerRow}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: checkIn.user_id } })}
        >
          <IconSymbol name="person.fill" size={14} color={colors.textSecondary} />
          <Text style={[styles.ownerText, { color: colors.text }]}>
            {isOwner ? '我' : ownerName}
            <Text style={{ color: colors.textSecondary, fontWeight: '400' }}> 的打卡</Text>
          </Text>
        </TouchableOpacity>

        {checkIn.location && (
          checkIn.venue_id ? (
            <TouchableOpacity
              style={styles.metaRow}
              onPress={() => router.push({ pathname: '/venue/[id]', params: { id: checkIn.venue_id! } })}
              activeOpacity={0.6}
            >
              <IconSymbol name="location.fill" size={13} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary, fontWeight: '600' }]} numberOfLines={1}>
                {checkIn.location}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.metaRow}>
              <IconSymbol name="location.fill" size={13} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {checkIn.location}
              </Text>
            </View>
          )
        )}
      </View>

      {/* Pending partner action */}
      {isPending && (
        <View style={[styles.actionCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '40' }]}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>
            {ownerName} 把你標記在這筆打卡紀錄
          </Text>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            接受後會出現在你的打卡列表
          </ThemedText>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.surface }, responding && { opacity: 0.5 }]}
              onPress={() => handleRespond('declined')}
              disabled={responding}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>拒絕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }, responding && { opacity: 0.5 }]}
              onPress={() => handleRespond('accepted')}
              disabled={responding}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>接受</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats */}
      {statEntries.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            數據
          </ThemedText>
          <View style={styles.statsGrid}>
            {statEntries.map((e) => (
              <View
                key={e.label}
                style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.statValue, { color: colors.text }]}>{String(e.value)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{e.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Partners */}
      {checkIn.partners && checkIn.partners.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            同伴
          </ThemedText>
          <View style={{ gap: Spacing.sm }}>
            {checkIn.partners.map((p) => {
              const prof = profiles[p.user_id];
              const name = prof?.display_name || prof?.username || '用戶';
              const statusColor =
                p.status === 'accepted' ? colors.statusSuccess :
                p.status === 'declined' ? colors.error :
                colors.textSecondary;
              const statusLabel =
                p.status === 'accepted' ? '已接受' :
                p.status === 'declined' ? '已拒絕' :
                '待確認';
              return (
                <TouchableOpacity
                  key={p.user_id}
                  style={[styles.partnerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.user_id } })}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="person.fill" size={14} color={colors.textSecondary} />
                  <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.partnerStatus, { color: statusColor }]}>{statusLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Notes */}
      {checkIn.notes && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            心得
          </ThemedText>
          <View style={[styles.notesBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.notesText, { color: colors.text }]}>{checkIn.notes}</Text>
          </View>
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />

      <CheckInShareModal
        visible={shareOpen}
        checkIn={checkIn}
        displayName={isOwner ? (user?.displayName || ownerName) : ownerName}
        onClose={() => setShareOpen(false)}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sportPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  dateText: { fontSize: 12 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ownerText: { fontSize: 15, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13 },

  actionCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionTitle: { fontSize: 15, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },

  section: { marginBottom: Spacing.xl, gap: Spacing.sm },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statBox: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 80,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12 },

  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  partnerName: { flex: 1, fontSize: 14, fontWeight: '500' },
  partnerStatus: { fontSize: 13, fontWeight: '600' },

  notesBox: {
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notesText: { fontSize: 14, lineHeight: 20 },
});
