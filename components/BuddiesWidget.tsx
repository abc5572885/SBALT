/**
 * Buddies widget — 常打球友 horizontal row.
 *
 * Used on Profile tab. Shows top 5 buddies derived from event co-attendance
 * and accepted check-in tags. Tap a buddy → their profile.
 */

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Buddy, getMyBuddies } from '@/services/buddies';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  userId: string;
}

export function BuddiesWidget({ userId }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [buddies, setBuddies] = useState<Buddy[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyBuddies(userId, 5)
      .then((b) => {
        if (!cancelled) setBuddies(b);
      })
      .catch(() => {
        if (!cancelled) setBuddies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (buddies === null) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>常打球友</Text>
        {buddies.length > 0 && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {buddies.length} 人
          </Text>
        )}
      </View>

      {buddies.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            跟你打過的人會自動出現在這裡
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {buddies.map((b) => (
            <TouchableOpacity
              key={b.user_id}
              style={styles.buddyCell}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: b.user_id } })}
              activeOpacity={0.7}
            >
              {b.avatar_url ? (
                <Image source={{ uri: b.avatar_url }} style={[styles.avatar, { borderColor: colors.border }]} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.text, borderColor: colors.border }]}>
                  <Text style={[styles.avatarInitial, { color: colors.background }]}>
                    {(b.display_name || b.username || '?')[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.buddyName, { color: colors.text }]} numberOfLines={1}>
                {b.display_name || b.username || '球友'}
              </Text>
              <Text style={[styles.buddyCount, { color: colors.textSecondary }]}>
                {b.sharedCount} 場同框
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    gap: Spacing.lg,
  },
  buddyCell: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '800',
  },
  buddyName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 4,
    textAlign: 'center',
  },
  buddyCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
