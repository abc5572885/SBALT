import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
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
        return '進行中';
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
    >
      <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <ThemedText style={styles.league}>{game.league}</ThemedText>
          <ThemedText style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </ThemedText>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.teamContainer}>
            <ThemedText style={styles.teamName}>
              {homeTeamName || game.home_team_id}
            </ThemedText>
            {game.home_score !== null && (
              <ThemedText style={styles.score}>{game.home_score}</ThemedText>
            )}
          </View>

          <ThemedText style={styles.vs}>VS</ThemedText>

          <View style={styles.teamContainer}>
            <ThemedText style={styles.teamName}>
              {awayTeamName || game.away_team_id}
            </ThemedText>
            {game.away_score !== null && (
              <ThemedText style={styles.score}>{game.away_score}</ThemedText>
            )}
          </View>
        </View>

        {game.venue && (
          <ThemedText style={styles.venue}>📍 {game.venue}</ThemedText>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  league: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  vs: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.5,
    marginHorizontal: 16,
  },
  venue: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
  },
});

