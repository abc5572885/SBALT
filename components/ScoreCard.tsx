import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Game } from '@/types/database';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface ScoreCardProps {
  game: Game;
  homeTeamName?: string;
  awayTeamName?: string;
}

export function ScoreCard({ game, homeTeamName, awayTeamName }: ScoreCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getStatusText = () => {
    switch (game.status) {
      case 'live':
        return 'LIVE';
      case 'finished':
        return '已結束';
      case 'scheduled':
        return new Date(game.scheduled_at).toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'cancelled':
        return '已取消';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (game.status) {
      case 'live':
        return colors.error;
      case 'finished':
        return colors.statusSecondary;
      default:
        return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/game/${game.id}`)}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        Shadows.sm,
      ]}>
        <View style={styles.header}>
          <ThemedText type="label" style={{ color: colors.textSecondary }}>
            {game.league}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
            <ThemedText type="label" style={{ color: getStatusColor() }}>
              {getStatusText()}
            </ThemedText>
          </View>
        </View>

        {/* Team names row */}
        <View style={styles.teamsRow}>
          <ThemedText type="caption" style={[styles.teamName, { color: colors.textSecondary }]} numberOfLines={1}>
            {homeTeamName || game.home_team_id || 'TBD'}
          </ThemedText>
          <View style={styles.vsContainer} />
          <ThemedText type="caption" style={[styles.teamName, { color: colors.textSecondary }]} numberOfLines={1}>
            {awayTeamName || game.away_team_id || 'TBD'}
          </ThemedText>
        </View>

        {/* Scores row */}
        <View style={styles.scoresRow}>
          <ThemedText style={styles.score}>
            {game.home_score !== null ? game.home_score : '-'}
          </ThemedText>
          <ThemedText style={[styles.vsText, { color: colors.textSecondary }]}>
            :
          </ThemedText>
          <ThemedText style={styles.score}>
            {game.away_score !== null ? game.away_score : '-'}
          </ThemedText>
        </View>

        {game.venue && (
          <View style={styles.venueRow}>
            <IconSymbol name="location.fill" size={12} color={colors.textSecondary} />
            <ThemedText type="caption" style={{ color: colors.textSecondary, marginLeft: 4 }}>
              {game.venue}
            </ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  teamName: {
    flex: 1,
    textAlign: 'center',
  },
  vsContainer: {
    width: 40,
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  score: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    textAlign: 'center',
    lineHeight: 40,
  },
  vsText: {
    fontSize: 20,
    fontWeight: '300',
    width: 24,
    textAlign: 'center',
    lineHeight: 40,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
});
