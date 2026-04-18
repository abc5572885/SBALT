import { PageHeader } from '@/components/PageHeader';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTournamentById, Tournament } from '@/services/tournaments';
import { createTeam } from '@/services/tournamentTeams';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function NewTeamScreen() {
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    getTournamentById(tournamentId).then((t) => {
      setTournament(t);
      setLoading(false);
    });
  }, [tournamentId]);

  const handleCreate = async () => {
    if (!user || !tournamentId) return;
    if (!name.trim()) {
      Alert.alert('缺少資料', '請輸入隊伍名稱');
      return;
    }
    try {
      setSaving(true);
      const team = await createTeam({
        tournament_id: tournamentId,
        name: name.trim(),
        captain_id: user.id,
      });
      router.replace({ pathname: '/tournament/team/[id]', params: { id: team.id } });
    } catch (error: any) {
      if (error?.code === '23505') {
        Alert.alert('名稱重複', '此賽事已有同名隊伍，請換一個');
      } else {
        Alert.alert('建立失敗', error.message || '請稍後再試');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <PageHeader title="建立隊伍" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (!tournament) return null;

  return (
    <ScreenLayout scrollable>
      <PageHeader title="建立隊伍" />

      <View style={styles.info}>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>賽事</ThemedText>
        <Text style={[styles.tournamentName, { color: colors.text }]}>{tournament.title}</Text>
        {tournament.team_size && (
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            每隊 {tournament.team_size} 人
          </ThemedText>
        )}
      </View>

      <View style={styles.field}>
        <ThemedText type="label" style={[styles.label, { color: colors.textSecondary }]}>
          隊伍名稱 *
        </ThemedText>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="例：竹北快攻"
          placeholderTextColor={colors.placeholder}
        />
      </View>

      <View style={[styles.hintCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ThemedText type="caption" style={{ color: colors.textSecondary, lineHeight: 20 }}>
          建立後你會成為隊長。{'\n'}
          下一步可邀請隊員加入，隊員同意後才算完成報名。
        </ThemedText>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, Shadows.sm, saving && { opacity: 0.5 }]}
        onPress={handleCreate}
        disabled={saving}
        activeOpacity={0.7}
      >
        <Text style={styles.submitText}>{saving ? '建立中...' : '建立隊伍'}</Text>
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  info: { marginBottom: Spacing.xl, gap: 2 },
  tournamentName: { fontSize: 18, fontWeight: '700' },
  field: { marginBottom: Spacing.xl },
  label: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  hintCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  submitBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
