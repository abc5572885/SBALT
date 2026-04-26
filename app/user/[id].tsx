import { PageHeader } from '@/components/PageHeader';
import { ProfileTimeline } from '@/components/ProfileTimeline';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UserActionMenu } from '@/components/UserActionMenu';
import { VerifiedBadge, VerifiedLabel } from '@/components/VerifiedBadge';
import { FontAwesome5 } from '@expo/vector-icons';
import { SPORT_OPTIONS, SPORT_POSITIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserStats } from '@/services/database';
import { BasketballCareerStats, CareerStats, getBasketballCareerStats, getUserCareerStats } from '@/services/sportStats';
import { getProfile, Profile, SportPositions } from '@/services/profile';
import { BuddyRelation, getBuddyRelation } from '@/services/buddies';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ organized: 0, joined: 0 });
  const [career, setCareer] = useState<CareerStats | null>(null);
  const [bballCareer, setBballCareer] = useState<BasketballCareerStats | null>(null);
  const [buddyRel, setBuddyRel] = useState<BuddyRelation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // If trying to view own profile, redirect to /profile
    if (user?.id === id) {
      router.replace('/profile');
      return;
    }
    const tasks: Promise<any>[] = [
      getProfile(id),
      getUserStats(id),
      getUserCareerStats(id),
      getBasketballCareerStats(id),
    ];
    if (user?.id) {
      tasks.push(getBuddyRelation(user.id, id));
    } else {
      tasks.push(Promise.resolve(null));
    }
    Promise.all(tasks)
      .then(([p, s, c, bb, rel]) => {
        setProfile(p);
        setStats(s);
        setCareer(c);
        setBballCareer(bb);
        setBuddyRel(rel);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user?.id, router]);

  const openUrl = (url: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  const normalizeInstagram = (value: string): string => {
    if (value.startsWith('http')) return value;
    const handle = value.replace(/^@/, '').trim();
    return `https://instagram.com/${handle}`;
  };

  const normalizeFacebook = (value: string): string => {
    if (value.startsWith('http')) return value;
    return `https://facebook.com/${value.trim()}`;
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="用戶資料" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout>
        <PageHeader title="用戶資料" />
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            找不到用戶
          </ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  const hasSocial = !!(profile.instagram_url || profile.facebook_url || profile.line_id);
  const displayName = profile.display_name || (profile.username ? `@${profile.username}` : `用戶 ${profile.id.slice(0, 8)}`);

  return (
    <ScreenLayout scrollable>
      <PageHeader
        title="用戶資料"
        rightContent={
          <View style={styles.socialRow}>
            {profile.instagram_url && (
              <TouchableOpacity
                onPress={() => openUrl(normalizeInstagram(profile.instagram_url!))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="instagram" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            {profile.facebook_url && (
              <TouchableOpacity
                onPress={() => openUrl(normalizeFacebook(profile.facebook_url!))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="facebook" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            {profile.line_id && (
              <TouchableOpacity
                onPress={() => openUrl(`https://line.me/ti/p/~${profile.line_id}`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="line" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <UserActionMenu
              targetUserId={profile.id}
              targetLabel={displayName}
              contentType="user"
              onBlocked={() => router.back()}
            />
          </View>
        }
      />

      {/* Avatar & Info */}
      <View style={styles.profileSection}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.text }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {displayName[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.nameRow}>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <VerifiedBadge accountType={profile.account_type} />
        </View>

        {profile.account_type === 'official' && profile.official_title && (
          <VerifiedLabel accountType={profile.account_type} officialTitle={profile.official_title} />
        )}

        {profile.username && profile.display_name && (
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            @{profile.username}
          </ThemedText>
        )}

        {profile.bio && (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
        )}

        {profile.region && (
          <Text style={[styles.region, { color: colors.textSecondary }]}>
            {profile.region}
          </Text>
        )}
      </View>

      {/* Buddy relation */}
      {buddyRel && (
        <View style={[styles.relationCard, { backgroundColor: colors.text }, Shadows.md]}>
          <Text style={[styles.relationLabel, { color: colors.background, opacity: 0.6 }]}>你們的關係</Text>
          <Text style={[styles.relationCount, { color: colors.background }]}>
            {buddyRel.sharedCount} 場同框
          </Text>
          {buddyRel.lastSeen && (
            <Text style={[styles.relationMeta, { color: colors.background, opacity: 0.6 }]}>
              最近一次 {new Date(buddyRel.lastSeen).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })}
            </Text>
          )}
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.organized}</Text>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>主辦活動</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.joined}</Text>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>參加活動</ThemedText>
        </View>
      </View>

      {/* Basketball Career Stats（詳細） */}
      {bballCareer && bballCareer.games > 0 && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            籃球生涯戰績
          </ThemedText>
          <View style={[styles.careerCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <View style={styles.careerTopRow}>
              <View style={styles.careerStat}>
                <Text style={[styles.careerNumber, { color: colors.primary }]}>{bballCareer.games}</Text>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>場</ThemedText>
              </View>
              <View style={styles.careerStat}>
                <Text style={[styles.careerNumber, { color: colors.primary }]}>{bballCareer.avgPoints.toFixed(1)}</Text>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>場均得分</ThemedText>
              </View>
              <View style={styles.careerStat}>
                <Text style={[styles.careerNumber, { color: colors.primary }]}>{bballCareer.avgRebounds.toFixed(1)}</Text>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>場均籃板</ThemedText>
              </View>
              <View style={styles.careerStat}>
                <Text style={[styles.careerNumber, { color: colors.primary }]}>{bballCareer.avgAssists.toFixed(1)}</Text>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>場均助攻</ThemedText>
              </View>
            </View>
            <View style={[styles.careerBreak, { borderTopColor: colors.border }]}>
              <View style={styles.careerSportRow}>
                <Text style={[styles.careerSportLabel, { color: colors.text }]}>總計</Text>
                <Text style={[styles.careerSportValue, { color: colors.textSecondary }]}>
                  {bballCareer.totalPoints} 分 / {bballCareer.totalRebounds} 板 / {bballCareer.totalAssists} 助
                </Text>
              </View>
              <View style={styles.careerSportRow}>
                <Text style={[styles.careerSportLabel, { color: colors.text }]}>抄阻</Text>
                <Text style={[styles.careerSportValue, { color: colors.textSecondary }]}>
                  {bballCareer.totalSteals} 抄截 / {bballCareer.totalBlocks} 阻攻
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 跨運動生涯數據（沒籃球或有其他運動時顯示） */}
      {career && career.totalEvents > 0 && (!bballCareer || bballCareer.games === 0 || Object.keys(career.bySport).length > 1) && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            其他運動數據
          </ThemedText>
          <View style={[styles.careerCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            {Object.entries(career.bySport)
              .filter(([sport]) => sport !== 'basketball' || (!bballCareer || bballCareer.games === 0))
              .map(([sport, s]) => {
                const sportLabel = SPORT_OPTIONS.find((o) => o.key === sport)?.label || sport;
                return (
                  <View key={sport} style={styles.careerSportRow}>
                    <Text style={[styles.careerSportLabel, { color: colors.text }]}>{sportLabel}</Text>
                    <Text style={[styles.careerSportValue, { color: colors.textSecondary }]}>
                      {s.events} 場 · {s.points} 分 · 場均 {s.average.toFixed(1)}
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      {/* Timeline */}
      <ProfileTimeline userId={profile.id} />

      {/* Favorite sports */}
      {profile.favorite_sports && profile.favorite_sports.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            喜好運動
          </ThemedText>
          <View style={styles.chipGrid}>
            {profile.favorite_sports.map((sportKey) => {
              const sportLabel = SPORT_OPTIONS.find((s) => s.key === sportKey)?.label || sportKey;
              return (
                <View key={sportKey} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.chipText, { color: colors.text }]}>{sportLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Sport positions */}
      {profile.favorite_sports?.map((sportKey) => {
        const positions = profile.sport_positions?.[sportKey as keyof SportPositions];
        if (!positions || positions.length === 0) return null;
        const sportLabel = SPORT_OPTIONS.find((s) => s.key === sportKey)?.label || sportKey;
        const posOptions = SPORT_POSITIONS[sportKey] || [];
        const posLabels = positions
          .map((p) => posOptions.find((o) => o.key === p)?.label || p)
          .join('、');
        return (
          <View key={sportKey} style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{sportLabel}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{posLabels}</Text>
          </View>
        );
      })}

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  region: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  relationCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
    gap: 4,
  },
  relationLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  relationCount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  relationMeta: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.lg,
  },
  careerCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  careerTopRow: { flexDirection: 'row', justifyContent: 'space-around' },
  careerStat: { alignItems: 'center', gap: 4 },
  careerNumber: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  careerBreak: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  careerSportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  careerSportLabel: { fontSize: 13, fontWeight: '600' },
  careerSportValue: { fontSize: 12 },
});
