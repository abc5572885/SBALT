import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSportConfig } from '@/constants/sports';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getOpenEvents, getRegistrationCounts } from '@/services/database';
import { Event } from '@/types/database';
import { formatDateChinese } from '@/utils/dateFormat';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SportScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const sportConfig = getSportConfig(type);

  const [events, setEvents] = useState<Event[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [type])
  );

  const loadEvents = async () => {
    try {
      const all = await getOpenEvents();
      const filtered = all.filter((e) => e.sport_type === type);
      setEvents(filtered);
      if (filtered.length > 0) {
        const counts = await getRegistrationCounts(filtered.map((e) => e.id));
        setRegCounts(counts);
      }
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setRefreshing(false);
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader title={sportConfig.label} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} />}
      >
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }, Shadows.sm]}
              onPress={() => router.push({ pathname: '/event/new', params: { templateSportType: type } })}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={16} color="#FFF" />
              <Text style={styles.createBtnText}>舉辦{sportConfig.label}活動</Text>
            </TouchableOpacity>

            {events.length > 0 ? (
              <View style={styles.eventList}>
                {events.map((evt) => (
                  <TouchableOpacity
                    key={evt.id}
                    style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                    onPress={() => router.push({ pathname: '/event/detail', params: { eventId: evt.id } })}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.eventTitle} numberOfLines={1}>{evt.title}</ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      {formatDateChinese(new Date(evt.scheduled_at))} · {evt.location}
                    </ThemedText>
                    <View style={styles.eventFooter}>
                      <ThemedText type="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                        {regCounts[evt.id] || 0}/{evt.quota} 人
                      </ThemedText>
                      {evt.fee > 0 && (
                        <ThemedText type="caption" style={{ color: colors.text }}>NT$ {evt.fee}</ThemedText>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.comingSoon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ThemedText style={{ color: colors.textSecondary }}>目前沒有{sportConfig.label}活動</ThemedText>
              </View>
            )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  tabText: { fontSize: 15, fontWeight: '600' },
  toolSection: { marginBottom: Spacing.xxl },
  toolTitle: { marginBottom: Spacing.xs },
  comingSoon: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
  },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  eventList: { gap: Spacing.sm },
  eventCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between' },
});
