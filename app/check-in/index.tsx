import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CheckIn, deleteCheckIn, getMyCheckIns } from '@/services/checkIns';
import { toast } from '@/store/useToast';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });
}

function formatStats(stats: Record<string, any> | null): string {
  if (!stats) return '';
  const parts: string[] = [];
  if (stats.games) parts.push(`${stats.games} 場`);
  if (stats.points) parts.push(`${stats.points} 分`);
  if (stats.threes) parts.push(`${stats.threes} 三分`);
  if (stats.rebounds) parts.push(`${stats.rebounds} 板`);
  if (stats.assists) parts.push(`${stats.assists} 助`);
  if (stats.kills) parts.push(`${stats.kills} 扣殺`);
  if (stats.blocks) parts.push(`${stats.blocks} 攔網`);
  if (stats.aces) parts.push(`${stats.aces} 發球得分`);
  if (stats.games_won) parts.push(`勝 ${stats.games_won}`);
  if (stats.games_lost) parts.push(`敗 ${stats.games_lost}`);
  return parts.join(' · ');
}

export default function CheckInListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMyCheckIns(user.id);
      setCheckIns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (item: CheckIn) => {
    Alert.alert('刪除打卡', `確定要刪除這筆打卡紀錄嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCheckIn(item.id);
            setCheckIns((prev) => prev.filter((c) => c.id !== item.id));
            toast.success('已刪除');
          } catch (e: any) {
            toast.error(e.message || '刪除失敗');
          }
        },
      },
    ]);
  };

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="我的打卡"
        rightContent={
          <TouchableOpacity
            onPress={() => router.push('/check-in/new')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.6}
          >
            <IconSymbol name="plus" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : checkIns.length === 0 ? (
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            還沒有打卡紀錄
          </ThemedText>
          <TouchableOpacity
            style={[styles.firstBtn, { backgroundColor: colors.primary }, Shadows.sm]}
            onPress={() => router.push('/check-in/new')}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>立即打卡</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {checkIns.map((c) => {
            const sportLabel = SPORT_OPTIONS.find((s) => s.key === c.sport_type)?.label || c.sport_type;
            const statsStr = formatStats(c.stats);
            return (
              <View
                key={c.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.sportPill, { backgroundColor: colors.primary + '15' }]}>
                    <ThemedText type="label" style={{ color: colors.primary }}>{sportLabel}</ThemedText>
                  </View>
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {formatDate(c.played_at)}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/check-in/[id]', params: { id: c.id, share: '1' } })}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="square.and.arrow.up" size={14} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(c)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="trash" size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
                {statsStr && (
                  <Text style={[styles.statsText, { color: colors.text }]}>{statsStr}</Text>
                )}
                {c.location && (
                  <View style={styles.metaRow}>
                    <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
                    <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                      {c.location}
                    </ThemedText>
                  </View>
                )}
                {c.notes && (
                  <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
                    {c.notes}
                  </Text>
                )}
                {c.partners && c.partners.length > 0 && (
                  <View style={styles.partnersRow}>
                    <IconSymbol name="person.fill" size={11} color={colors.textSecondary} />
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      與 {c.partners.length} 位同伴
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.lg },
  firstBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  sportPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  dateText: { fontSize: 12 },
  statsText: { fontSize: 16, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notesText: { fontSize: 13, marginTop: 4 },
  partnersRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
