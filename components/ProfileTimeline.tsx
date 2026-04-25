import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TimelineItem, getProfileTimeline } from '@/services/profileTimeline';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  userId: string;
  limit?: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

export function ProfileTimeline({ userId, limit = 8 }: Props) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [items, setItems] = useState<TimelineItem[] | null>(null);

  useEffect(() => {
    getProfileTimeline(userId, limit)
      .then(setItems)
      .catch(() => setItems([]));
  }, [userId, limit]);

  if (items === null) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        最近活動
      </ThemedText>
      <View style={{ gap: Spacing.sm }}>
        {items.map((item) => {
          const sportLabel = SPORT_OPTIONS.find((s) => s.key === item.sport)?.label || item.sport;
          const isCheckIn = item.kind === 'check_in';
          const tagBg = isCheckIn ? colors.secondary : colors.primary + '15';
          const tagColor = isCheckIn ? colors.textSecondary : colors.primary;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => {
                if (isCheckIn) {
                  router.push({ pathname: '/check-in/[id]', params: { id: item.routeId } });
                } else {
                  router.push({ pathname: '/event/[id]', params: { id: item.routeId } });
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardBody}>
                <View style={styles.headerRow}>
                  <View style={[styles.tag, { backgroundColor: tagBg }]}>
                    <Text style={[styles.tagText, { color: tagColor }]}>
                      {isCheckIn ? '打卡' : '正式'}
                    </Text>
                  </View>
                  <Text style={[styles.sportText, { color: colors.textSecondary }]}>{sportLabel}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {formatDate(item.date)}
                  </Text>
                </View>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.summary}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={14} color={colors.disabled} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.xl },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },
  loadingBox: { paddingVertical: Spacing.lg, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  cardBody: { flex: 1, gap: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  sportText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 11 },
  title: { fontSize: 14, fontWeight: '600' },
  summary: { fontSize: 13 },
});
