import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyTeams } from '@/services/tournamentTeams';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Row {
  id: string;
  team_id: string;
  role: 'captain' | 'member';
  tournament_teams: {
    id: string;
    name: string;
    captain_id: string;
    status: string;
    tournaments: {
      id: string;
      title: string;
      sport_type: string;
      start_date: string;
      team_size: number | null;
    } | null;
  } | null;
}

export default function MyTeamsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMyTeams(user.id);
      setRows(data as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="我的隊伍" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (rows.length === 0) {
    return (
      <ScreenLayout>
        <PageHeader title="我的隊伍" />
        <View style={styles.center}>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            還沒加入任何隊伍
          </ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable>
      <PageHeader title="我的隊伍" />

      <View style={{ gap: Spacing.sm }}>
        {rows.map((row) => {
          const team = row.tournament_teams;
          const tournament = team?.tournaments;
          if (!team) return null;
          const sportLabel = tournament ? (SPORT_OPTIONS.find((s) => s.key === tournament.sport_type)?.label || '') : '';
          const startStr = tournament ? new Date(tournament.start_date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '';

          return (
            <TouchableOpacity
              key={row.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
              onPress={() => router.push({ pathname: '/tournament/team/[id]', params: { id: team.id } })}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                {row.role === 'captain' && (
                  <View style={[styles.captainBadge, { backgroundColor: colors.primary + '15' }]}>
                    <ThemedText type="label" style={{ color: colors.primary }}>隊長</ThemedText>
                  </View>
                )}
              </View>
              <Text style={[styles.tournamentTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {tournament?.title}
              </Text>
              <View style={styles.metaRow}>
                {sportLabel && (
                  <>
                    <IconSymbol name="sportscourt.fill" size={12} color={colors.textSecondary} />
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>{sportLabel}</ThemedText>
                  </>
                )}
                {startStr && (
                  <>
                    <Text style={{ color: colors.disabled }}>·</Text>
                    <IconSymbol name="calendar" size={12} color={colors.textSecondary} />
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>{startStr}</ThemedText>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: { fontSize: 17, fontWeight: '700' },
  captainBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tournamentTitle: { fontSize: 13 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
});
